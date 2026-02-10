import { describe, it, expect } from 'vitest'
import {
    isCaberawitClass,
    isTeacherClass,
    isSambungDesaEligible,
    type ClassData,
} from '../classHelpers'

describe('classHelpers', () => {
    describe('isCaberawitClass', () => {
        it('should return true for class with CABERAWIT category code', () => {
            const classData: ClassData = {
                name: 'Kelas 1',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '1',
                            name: 'Caberawit',
                            category: {
                                id: 'cat-1',
                                code: 'CABERAWIT',
                                name: 'Caberawit',
                            },
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(true)
        })

        it('should return true for class with PAUD category code', () => {
            const classData: ClassData = {
                name: 'PAUD A',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '2',
                            name: 'PAUD',
                            category: {
                                id: 'cat-2',
                                code: 'PAUD',
                                name: 'PAUD',
                            },
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(true)
        })

        it('should return false for class without category', () => {
            const classData: ClassData = {
                name: 'Remaja',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '3',
                            name: 'Remaja',
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(false)
        })

        it('should return false for class with different category', () => {
            const classData: ClassData = {
                name: 'Remaja',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '4',
                            name: 'Remaja',
                            category: {
                                id: 'cat-3',
                                code: 'REMAJA',
                                name: 'Remaja',
                            },
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

        it('should handle case-insensitive category codes', () => {
            const classData: ClassData = {
                name: 'Kelas 2',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '5',
                            name: 'Caberawit',
                            category: {
                                id: 'cat-4',
                                code: 'caberawit',
                                name: 'Caberawit',
                            },
                        },
                    },
                ],
            }

            expect(isCaberawitClass(classData)).toBe(true)
        })

        it('should handle array format from Supabase', () => {
            const classData: ClassData = {
                name: 'Kelas 3',
                class_master_mappings: [
                    {
                        class_master: [
                            {
                                id: '6',
                                name: 'Caberawit',
                                category: {
                                    id: 'cat-5',
                                    code: 'CABERAWIT',
                                    name: 'Caberawit',
                                },
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
        it('should return true for regular class (not Caberawit, not Teacher)', () => {
            const classData: ClassData = {
                name: 'Remaja Kelas 1',
                class_master_mappings: [
                    {
                        class_master: {
                            id: '7',
                            name: 'Remaja',
                            category: {
                                id: 'cat-6',
                                code: 'REMAJA',
                                name: 'Remaja',
                            },
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
                            name: 'Caberawit',
                            category: {
                                id: 'cat-7',
                                code: 'CABERAWIT',
                                name: 'Caberawit',
                            },
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
                            name: 'PAUD',
                            category: {
                                id: 'cat-8',
                                code: 'PAUD',
                                name: 'PAUD',
                            },
                        },
                    },
                ],
            }

            expect(isSambungDesaEligible(classData)).toBe(false)
        })
    })
})
