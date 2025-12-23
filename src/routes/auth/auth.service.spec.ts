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
import { EmailAlreadyExistsException, InvalidOTPException, OTPExpiredException } from "./auth.error"
import { Prisma } from "@prisma/client"

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

    afterEach(() => {
        jest.clearAllMocks()
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

    describe('register', () => {
        it('should register a new user successfully', async () => {
            jest.spyOn(authService, 'validateVerificationCode').mockResolvedValue(null as any)
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                phoneNumber: '0123456789',
                confirmPassword: 'password123',
                code: '123456'
            }
            const mockUser = {
                id: 1,
                email: registerData.email,
                name: registerData.name,
                phoneNumber: registerData.phoneNumber,
                password: registerData.password,
                roleId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedRoleRepository.getClientRoleId.mockResolvedValue(1)
            mockHashingService.hash.mockResolvedValue('hashedPassword')
            mockAuthRepository.createUser.mockResolvedValue(mockUser),
                mockAuthRepository.deleteVerificationCode.mockResolvedValue(null)
            const result = await authService.register(registerData)
            expect(result).toEqual(mockUser)
            expect(mockHashingService.hash).toHaveBeenCalledWith(registerData.password)
            expect(mockAuthRepository.createUser).toHaveBeenCalled()
            expect(mockAuthRepository.deleteVerificationCode).toHaveBeenCalled()
        })

        it('should throw EmailAlreadyExistsException when email already exists', async () => {
            jest.spyOn(authService, 'validateVerificationCode').mockResolvedValue(null as any)
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                phoneNumber: '0123456789',
                confirmPassword: 'password123',
                code: '123456'
            }

            mockSharedRoleRepository.getClientRoleId.mockResolvedValue(1)
            mockHashingService.hash.mockResolvedValue('hashedPassword')
            const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
                code: 'P2002',
                clientVersion: '6.0.0'
            })

            mockAuthRepository.createUser.mockRejectedValue(error)
            mockAuthRepository.deleteVerificationCode.mockResolvedValue(null)
            await expect(authService.register(registerData)).rejects.toStrictEqual(EmailAlreadyExistsException)
        })

        it('should throw Error when validation fails', async () => {
            jest.spyOn(authService, 'validateVerificationCode').mockRejectedValue(null)

            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                phoneNumber: '0123456789',
                confirmPassword: 'password123',
                code: '123456',
            }

            await expect(authService.register(registerData)).rejects.toBeDefined()

            
            
            expect(mockSharedRoleRepository.getClientRoleId).not.toHaveBeenCalled()
            expect(mockHashingService.hash).not.toHaveBeenCalled()
            expect(mockAuthRepository.createUser).not.toHaveBeenCalled()
            expect(mockAuthRepository.deleteVerificationCode).not.toHaveBeenCalled()
        })

    })




})

