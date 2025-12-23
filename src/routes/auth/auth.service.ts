/* eslint-disable @typescript-eslint/await-thenable */
import { ConflictException, HttpException, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { HashingService } from 'src/shared/services/hashing.service';
import { DisableTwoFactorBodyType, ForgotPasswordBodyType, LoginBodyType, RefreshTokenBodyType, RegisterBodyType, SendOTPBodyType } from './auth.model';
import { AuthRepository } from './auth.repo';
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo';
import { generateOTP } from 'src/shared/helpers';
import { addMilliseconds } from 'date-fns';
import ms from 'ms'
import envConfig from 'src/shared/config';
import { TypeOfVerificationCode, TypeOfVerificationCodeType } from 'src/shared/constants/auth.constant';
import { EmailService } from 'src/shared/services/email.service';
import { AccessTokenPayloadCreate } from 'src/shared/types/jwt.type';
import { TokenService } from 'src/shared/services/token.service';
import { EmailAlreadyExistsException, EmailNotFoundException, FailedToSendOTPException, InvalidPasswordException, InvalidTOTPAndCodeException, InvalidTOTPException, OTPExpiredException, RefreshTokenAlreadyUsedException, TOTPAlreadyEnabledException, TOTPNotEnabledException, UnauthorizedAccessException } from './error.model';
import { TwoFactorService } from 'src/shared/services/2fa.service';
import { SharedRoleRepository } from 'src/shared/repositories/shared-role.repo';
import { InvalidOTPException } from './auth.error';
import { Prisma } from '@prisma/client';


@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService
  ) {}

  async validateVerificationCode({
    email,
    code,
    type,
  }: {
    email: string
    code: string
    type: TypeOfVerificationCodeType
  }) {
    const vevificationCode = await this.authRepository.findUniqueVerificationCode({
      email_code_type: {
        email, code,type
      }
    })
    if (!vevificationCode || vevificationCode.code !== code) {
      throw InvalidOTPException
    }
    if (new Date(vevificationCode.expiresAt) < new Date()) {
      throw OTPExpiredException
    }
    return vevificationCode
  }

  async register(body: RegisterBodyType) {
    try {
      await this.validateVerificationCode({email: body.email, type: TypeOfVerificationCode.REGISTER, code: body.code})
      const clientRoleId = await this.sharedRoleRepository.getClientRoleId()
      const hashedPassword = await this.hashingService.hash(body.password)

      const [user] = await Promise.all([this.authRepository.createUser({
        email: body.email,
        name: body.name,
        phoneNumber: body.phoneNumber,
        password: hashedPassword,
        roleId: clientRoleId,
      }),
      this.authRepository.deleteVerificationCode({
         email_code_type: {email: body.email,code: body.code, type: TypeOfVerificationCode.REGISTER}
        }),
    ])
     return user
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw EmailAlreadyExistsException
      }
      throw error
    }
  }

  async sendOTP(body:SendOTPBodyType){
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUnique({
      email: body.email,
    })
     if (body.type === TypeOfVerificationCode.REGISTER && user) {
      throw EmailAlreadyExistsException
    }

     if (body.type === TypeOfVerificationCode.FORGOT_PASSWORD && !user) {
      throw EmailNotFoundException
    }
    // 2. Tạo mã OTP

    const code = generateOTP()
    const verificationCode = await this.authRepository.createVerificationCode({
      email: body.email,
      type: body.type,
      code,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPRIRES_IN)).toISOString(),
    })

    // 3. Gửi mã OTP
    const { error } = await this.emailService.sendOTP({
      email: body.email,
      code,
    })
    if (error) {
      throw FailedToSendOTPException
    }
    // return verificationCode
    return { message: 'Gửi mã OTP thành công' }
  }

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    console.log(body)
    // 1. Lấy thông tin user, kiểm tra user có tồn tại hay không, mật khẩu có đúng không
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email,
    })
    if (!user) {
      throw EmailNotFoundException
    }

    const isPasswordMatch = await this.hashingService.compare(body.password, user.password)
    if (!isPasswordMatch) {
      throw InvalidPasswordException
    }
    // 2. Nếu user đã bật mã 2FA thì kiểm tra mã 2FA TOTP Code hoặc OTP Code (email)
    if (user.totpSecret) {
      // Nếu không có mã TOTP Code và Code thì thông báo cho client biết
      if (!body.totpCode && !body.code) {
        throw InvalidTOTPAndCodeException
      }

      // Kiểm tra TOTP Code có hợp lệ hay không
      if (body.totpCode) {
        const isValid = this.twoFactorService.verifyTOTP({
          email: user.email,
          secret: user.totpSecret,
          token: body.totpCode,
        })
        if (!isValid) {
          throw InvalidTOTPException
        }
      } else if (body.code) {
         console.log("hello")
        // Kiểm tra mã OTP có hợp lệ không
        await this.validateVerificationCode({
          email: user.email,
          type: TypeOfVerificationCode.LOGIN,
          code: body.code,
        })
      }
    }

    // 3. Tạo mới device
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: body.userAgent,
      ip: body.ip,
    })

    // 4. Tạo mới accessToken và refreshToken
    const tokens = await this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
    return tokens
  }

   // 4. Tạo mới accessToken và refreshToken
  async generateTokens({ userId, deviceId, roleId, roleName }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({userId, deviceId, roleId, roleName}),
      this.tokenService.signRefreshToken({userId}),
    ])
    const decodedRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
      deviceId
    })
    return { accessToken, refreshToken }
  }


  async refreshToken({refreshToken, userAgent,ip}: RefreshTokenBodyType & {userAgent: string; ip: string}) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ không
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)
      // 2. Kiểm tra refreshToken có tồn tại trong database không
      const refreshTokenInDb = await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
        token: refreshToken
      })
      if (!refreshTokenInDb) {
        // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
        // refresh token của họ đã bị đánh cắp
        throw RefreshTokenAlreadyUsedException
      }

      const {deviceId, user: {roleId, role: {name: roleName}}} = refreshTokenInDb
      // 3. cập nhật device
      const $updateDevice = this.authRepository.updateDevice(deviceId, {ip, userAgent})
      // 4. xoá refreshToken cũ
      const $deleteRefreshToken = this.authRepository.deleteRefreshToken({ token: refreshToken })

      // 5 tạo mới accesstoken và refreshToken
      const $tokens = this.generateTokens({userId, roleId, roleName, deviceId})
      const [, , tokens] = await Promise.all([$updateDevice, $deleteRefreshToken, $tokens])
    } catch (error) {
      // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
      // refresh token của họ đã bị đánh cắp
      if (error instanceof HttpException) {
        throw error
      }
      throw UnauthorizedAccessException
    }
  }

  async logout(refreshToken: string) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ không
      await this.tokenService.verifyRefreshToken(refreshToken)
      // 2. Xóa refreshToken trong database
       const deletedRefreshToken = await this.authRepository.deleteRefreshToken({
          token: refreshToken,
      })
      // 3 cập nhật device là đã logout
      await this.authRepository.updateDevice(deletedRefreshToken.deviceId, {isActive: false})
      return { message: 'Đăng xuất thành công'  }
    } catch (error) {
      // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
      // refresh token của họ đã bị đánh cắp
      // if (isNotFoundPrismaError(error)) {
      //   throw new UnauthorizedException('Refresh token has been revoked')
      // }
      throw UnauthorizedAccessException
    }
  }


  async forgotPassword(body: ForgotPasswordBodyType){
    const {email, code, newPassword} = body

    const user = await this.sharedUserRepository.findUnique({email,})

    if(!user){
      throw EmailNotFoundException
    }

    await this.validateVerificationCode({email, code, type: TypeOfVerificationCode.FORGOT_PASSWORD})

    const hashedPassword = await this.hashingService.hash(newPassword)

    await Promise.all([
      this.sharedUserRepository.update(
        { id: user.id},
        {
          password: hashedPassword,
          updatedById: user.id,
        },
      ),
      this.authRepository.deleteVerificationCode({
        email_code_type: {email,code, type: TypeOfVerificationCode.FORGOT_PASSWORD}
      }),
    ])

    return {
      message: 'Đổi mật khẩu thành công',
    }
  }


  async setupTwoFactorAuth(userId: number){
    const user = await this.sharedUserRepository.findUnique({id: userId})

    if(!user){
      throw EmailNotFoundException
    }

    if(user.totpSecret){
      throw TOTPAlreadyEnabledException
    }

    // 2 tạo ra secret và uri
    const {secret, uri} = this.twoFactorService.generateTOTPSecret(user.email)
    // 3 cập nhật secret vào user trong database
    await this.sharedUserRepository.update({id: userId}, {totpSecret: secret, updatedById: userId})
    // 4 trả về secret và url
    return {
      secret, uri
    }
  }


  async disableTwoFactorAuth(data: DisableTwoFactorBodyType & {userId: number}){

    const {userId, totpCode, code} = data

    // 1. Lấy thông tin user, kiểm tra xem user có tồn tại hay không, và xem họ đã bật 2FA chưa
    const user = await this.sharedUserRepository.findUnique({id: userId})

    if(!user){
      throw EmailNotFoundException
    }

    if(!user.totpSecret){
      throw TOTPNotEnabledException
    }

    // 2 kiểm tra mã TOTP có hợp lệ hay không
    if(totpCode){
      const isValid = this.twoFactorService.verifyTOTP({
        email: user.email,
        secret: user.totpSecret,
        token: totpCode
      })

      if(!isValid){
        throw InvalidOTPException
      }
    }else if(code){
      // 3 kiểm tra mã OTP email có hợp lệ hay không
      await this.validateVerificationCode({
        email: user.email,
        code,
        type: TypeOfVerificationCode.DISABLE_2FA
      })
    }

    await this.sharedUserRepository.update({id: userId}, {totpSecret: null, updatedById: userId})

    // 5. Trả về thông báo
    return {
      message: 'Tắt 2FA thành công',
    }

    
  }

}
