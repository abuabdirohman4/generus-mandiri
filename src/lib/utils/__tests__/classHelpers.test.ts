import { describe, it, expect } from 'vitest'
import {
    isCaberawitClass,
    isTeacherClass,
    isSambungDesaEligible,
    isPraNikahName,
    isPraNikahClass,
    type ClassData,
} from '../classHelpers'

describe('classHelpers', () => {
    describe('isCaberawitClass', () => {
        it('should return true for class with caberawit category_group (CABERAWIT)', () => {
            const classData: ClassData = {
                name: 'Kelas 1',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '1',
                            name: 'Kelas 1',
                            category_group: 'caberawit',
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(true)
        })

        it('should return true for class with caberawit category_group (PAUD)', () => {
            const classData: ClassData = {
                name: 'PAUD A',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '2',
                            name: 'Kelas Paud',
                            category_group: 'caberawit',
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(true)
        })

        it('should return false for class without category_group', () => {
            const classData: ClassData = {
                name: 'Pengurus',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '3',
                            name: 'Pengurus',
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(false)
        })

        it('should return false for class with different category_group (muda_mudi)', () => {
            const classData: ClassData = {
                name: 'SMA 1',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '4',
                            name: 'SMA 1',
                            category_group: 'muda_mudi',
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(false)
        })

        it('should return false for class without mappings', () => {
            const classData: ClassData = {
                name: 'Test Class',
                class_master_mappings: [],
            }

            expect(isCaberawitClass(classData)).toBe(false)
        })

        it('should return false for Pengurus (null category_group)', () => {
            const classData: ClassData = {
                name: 'Pengurus',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '5',
                            name: 'Pengurus',
                            category_group: null,
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(false)
        })

        it('should handle array format from Supabase', () => {
            const classData: ClassData = {
                name: 'Kelas 3',
                class_master_mappings: [
                    {
                        class_master: [
                            {
                                id: '6',
                                name: 'Kelas 3',
                                category_group: 'caberawit',
                            },
                        ],
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(true)
        })
    })

    describe('isTeacherClass', () => {
        it('should return true for class with "pengajar" in name', () => {
            const classData: ClassData = {
                name: 'Kelas Pengajar',
            }

            expect(isTeacherClass(classData)).toBe(true)
        })

        it('should return true for case-insensitive "pengajar"', () => {
            const classData: ClassData = {
                name: 'PENGAJAR REMAJA',
            }

            expect(isTeacherClass(classData)).toBe(true)
        })

        it('should return false for class without "pengajar" in name', () => {
            const classData: ClassData = {
                name: 'Remaja Kelas 1',
            }

            expect(isTeacherClass(classData)).toBe(false)
        })

        it('should return false for class without name', () => {
            const classData: ClassData = {}

            expect(isTeacherClass(classData)).toBe(false)
        })
    })

    describe('isSambungDesaEligible', () => {
        it('should return true for muda_mudi class (not Caberawit, not Teacher)', () => {
            const classData: ClassData = {
                name: 'SMA 1',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '7',
                            name: 'SMA 1',
                            category_group: 'muda_mudi',
                        },
                    },
                ],
            }

            expect(isSambungDesaEligible(classData)).toBe(true)
        })

        it('should return false for Caberawit class', () => {
            const classData: ClassData = {
                name: 'Kelas 1',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '8',
                            name: 'Kelas 1',
                            category_group: 'caberawit',
                        },
                    },
                ],
            }

            expect(isSambungDesaEligible(classData)).toBe(false)
        })

        it('should return false for Teacher class', () => {
            const classData: ClassData = {
                name: 'Pengajar Remaja',
            }

            expect(isSambungDesaEligible(classData)).toBe(false)
        })

        it('should return false for class that is both Caberawit and Teacher', () => {
            const classData: ClassData = {
                name: 'Pengajar PAUD',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '9',
                            name: 'Kelas Paud',
                            category_group: 'caberawit',
                        },
                    },
                ],
            }

            expect(isSambungDesaEligible(classData)).toBe(false)
        })
    })

    describe('isPraNikahName', () => {
        it('should return true for names containing "pra nikah"', () => {
            expect(isPraNikahName('Pra Nikah 1')).toBe(true)
            expect(isPraNikahName('Pra Nikah 2')).toBe(true)
            expect(isPraNikahName('PRA NIKAH 3')).toBe(true)
            expect(isPraNikahName('pra nikah')).toBe(true)
        })

        it('should return false for names not containing "pra nikah"', () => {
            expect(isPraNikahName('Kelas 1')).toBe(false)
            expect(isPraNikahName('SMP 1')).toBe(false)
            expect(isPraNikahName('Pra Remaja')).toBe(false)
            expect(isPraNikahName('')).toBe(false)
        })
    })

    describe('isPraNikahClass', () => {
        it('should return true for ClassData with "pra nikah" in name', () => {
            expect(isPraNikahClass({ name: 'Pra Nikah 1' })).toBe(true)
        })

        it('should return false for ClassData without "pra nikah" in name', () => {
            expect(isPraNikahClass({ name: 'Remaja' })).toBe(false)
            expect(isPraNikahClass({})).toBe(false)
        })
    })
})
