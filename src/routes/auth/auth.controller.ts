import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordBodyDTO, GetAuthorizationUrlResDTO, LoginBodyDTO, LoginResDTO, LogoutBodyDTO, RefreshTokenBodyDTO, RefreshTokenResDTO, RegisterBodyDTO, RegisterResDTO, SendOTPBodyDTO, TwoFactorSetupResDTO } from './auth.dto';
import { ZodResponse, ZodSerializerDto } from 'nestjs-zod';
import { UserAgent } from 'src/shared/decorators/user-agent.decorator';
import { MessageResDTO } from 'src/shared/dtos/response.dto';
import { IsPublic } from 'src/shared/decorators/auth.decorator';
import { GoogleService } from './google.service';
import type { Response } from 'express';
import envConfig from 'src/shared/config';
import { ActiveUser } from 'src/shared/decorators/active-user.decorator';
import { EmptyBodyDTO } from 'src/shared/dtos/request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly googleService: GoogleService) {}

  @Post('register')
  @IsPublic()
  @ZodResponse({ type: RegisterResDTO })
  async register(@Body() body: RegisterBodyDTO) {
    return (await this.authService.register(body))
  }

  @Post('otp')
  @IsPublic()
  // @ZodResponse({ type: MessageResDTO })
  async sendOTP(@Body() body: SendOTPBodyDTO) {
    return (await this.authService.sendOTP(body))
  }


  @Post('login')
  @IsPublic()
  @ZodResponse({ type: LoginResDTO })
  async login(@Body() body: LoginBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return (await this.authService.login({...body, userAgent, ip}))
  }



  @Post('refresh-token')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  // @ZodResponse({ type: RefreshTokenResDTO })
  async refreshToken(@Body() body: RefreshTokenBodyDTO, @UserAgent() userAgent: string, @Ip() ip: string) {
    return await this.authService.refreshToken({
      refreshToken: body.refreshToken,
      userAgent, ip
    })
  }

  @Post('logout')
  @ZodResponse({ type: MessageResDTO })
  async logout(@Body() body: LogoutBodyDTO) {
    return await this.authService.logout(body.refreshToken)
  }

  @Get('google-link')
  @IsPublic()
  @ZodSerializerDto(GetAuthorizationUrlResDTO)
  getAuthorizationUrl(@UserAgent() userAgent: string, @Ip() ip: string){
    return this.googleService.getAuthorizationUrl({userAgent, ip})
  }


  @Get('google/callback')
  @IsPublic()
  async getCallback(@Query('code') code:string, @Query('state') state: string,  @Res() res: Response){
    try {
      const data = await this.googleService.googleCallback({
        code, state
      })
      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại bằng cách khác'
      return res.redirect(`${envConfig.GOOGLE_CLIENT_REDIRECT_URI}?errorMessage=${message}`)
    }
  }

  @Post('forgot-password')
  @IsPublic()
  @ZodResponse({ type: MessageResDTO })
  forgotPassword(@Body() body: ForgotPasswordBodyDTO){
    return this.authService.forgotPassword(body)
  }

  @ZodSerializerDto(TwoFactorSetupResDTO)
  setupTwoFactorAuth(@Body() _: EmptyBodyDTO, @ActiveUser('userId') userId: number) {
    return this.authService.setupTwoFactorAuth(userId)
  }


}

