import { Test, TestingModule } from "@nestjs/testing"
import { AuthService } from "./auth.service"
import { AuthRepository } from "./auth.repo"
import { SharedUserRepository } from "src/shared/repositories/shared-user.repo"
import { SharedRoleRepository } from "src/shared/repositories/shared-role.repo"
import { TokenService } from "src/shared/services/token.service"
import { EmailService } from "src/shared/services/email.service"
import { TwoFactorService } from "src/shared/services/2fa.service"
import { TypeOfVerificationCode } from "src/shared/constants/auth.constant"
import { HashingService } from "src/shared/services/hashing.service"
import { InvalidOTPException, OTPExpiredException } from "./auth.error"

describe('AuthService', () => {
    let authService: AuthService
    const mockAuthRepository = {
        findUniqueVerificationCode: jest.fn(),
        createUser: jest.fn(),
        deleteVerificationCode: jest.fn(),
        createVerificationCode: jest.fn(),
        findUniqueUserIncludeRole: jest.fn(),
        createDevice: jest.fn(),
        createRefreshToken: jest.fn(),
        findUniqueRefreshTokenIncludeUserRole: jest.fn(),
        updateDevice: jest.fn(),
        deleteRefreshToken: jest.fn()
    }

    const mockHashingService = {
        hash: jest.fn(),
        compare: jest.fn()
    }

    const mockSharedUserRepository = {
        findUnique: jest.fn(),
        update: jest.fn(),
    }

    const mockSharedRoleRepository = {
        getClientRoleId: jest.fn()
    }

    const mockTokenService = {
        signAccessToken: jest.fn(),
        signRefreshToken: jest.fn(),
        verifyRefreshToken: jest.fn()
    }

    const mockEmailService = {
        sendOtp: jest.fn(),
    }

    const mockTwoFactoryService = {
        generateTOTPSecret: jest.fn(),
        verifyTPTP: jest.fn()
    }

    beforeEach(async () => {
        const modele: TestingModule = await Test.createTestingModule(({
            providers: [
                AuthService,
                {
                    provide: AuthRepository,
                    useValue: mockAuthRepository,
                },
                {
                    provide: SharedUserRepository,
                    useValue: mockSharedUserRepository,
                },
                {
                    provide: SharedRoleRepository,
                    useValue: mockSharedRoleRepository,
                },
                {
                    provide: HashingService,
                    useValue: mockHashingService,
                },
                {
                    provide: TokenService,
                    useValue: mockTokenService,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: TwoFactorService,
                    useValue: mockTwoFactoryService,
                },
            ]
        })).compile()

        authService = modele.get<AuthService>(AuthService)
    })

    describe('validateVerificationCode', () => {
        it('xác thực mã xác minh thành công', async () => {
            const mockVerificationCode = {
                id: 1,
                email: 'test@gmail.com',
                type: TypeOfVerificationCode.REGISTER,
                code: '123456',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                ceatedAt: new Date()
            }

            mockAuthRepository.findUniqueVerificationCode.mockResolvedValue(mockVerificationCode)

            const result = await authService.validateVerificationCode({
                email: 'test@example.com',
                type: TypeOfVerificationCode.REGISTER,
                code: '123456',
            })

            expect(result).toEqual(mockVerificationCode)
        })

        it('should throw InvalidOTPException if verificationCode is not found', async () => {
            mockAuthRepository.findUniqueVerificationCode.mockResolvedValue(null)

            await expect(authService.validateVerificationCode({
                email: 'test@gmail.com',
                type: TypeOfVerificationCode.REGISTER,
                code: '123456'
            })).rejects.toThrow(InvalidOTPException)
        })

        it('should throw InvalidOTPException when code is incorrect', async () => {
            const mockVerificationCode = {
                id: 1,
                email: 'test@gmail.com',
                type: TypeOfVerificationCode.REGISTER,
                code: '123456',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                ceatedAt: new Date()
            }

            mockAuthRepository.findUniqueVerificationCode.mockResolvedValue(mockVerificationCode)
            await expect(authService.validateVerificationCode({
                email: 'test@example.com',
                type: TypeOfVerificationCode.REGISTER,
                code: '654321',
            })).rejects.toThrow(InvalidOTPException)
        })

        it('should throw OTPExpiredException when code is expired',
            async () => {
                const mockVerificationCode = {
                    id: 1,
                    email: 'test@gmail.com',
                    type: TypeOfVerificationCode.REGISTER,
                    code: '123456',
                    expiresAt: new Date(Date.now() - 5 * 60 * 1000),
                    createdAt: new Date()
                }

                mockAuthRepository.findUniqueVerificationCode.mockResolvedValue(mockVerificationCode)
                await expect(authService.validateVerificationCode({
                    email: 'test@example.com',
                    type: TypeOfVerificationCode.REGISTER,
                    code: '123456',
                })).rejects.toThrow(OTPExpiredException)
            }
        )

    })


})

