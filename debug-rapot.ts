
import { getStudentEnrollments } from './src/app/(admin)/tahun-ajaran/actions/enrollments';
import { getApplicableTemplate, resolveSectionItems } from './src/app/(admin)/rapot/templates/actions';

async function debugResolution() {
    const studentId = '11111111-1111-1111-1111-111111111111';
    const academicYearId = '8eaba413-5836-4015-90ac-36fcacbb12a9';
    const semester = 1;

    console.log('--- Debugging Rapot Data Loading ---');

    // 1. Check Enrollment & Class Master ID
    console.log('1. Fetching Enrollment...');
    const enrollments = await getStudentEnrollments(studentId);
    const currentEnrollment = enrollments.find(e =>
        e.academic_year_id === academicYearId &&
        parseInt(String(e.semester)) === semester
    );

    if (!currentEnrollment) {
        console.error('❌ No active enrollment found!');
        return;
    }

    const enrollmentClass = currentEnrollment.class;
    console.log('   Enrollment Class:', enrollmentClass?.name);
    // @ts-ignore
    const mappings = enrollmentClass?.class_master_mappings;
    console.log('   Mappings raw:', JSON.stringify(mappings));

    const currentClassMasterId = mappings?.[0]?.class_master_id;
    console.log('   Resolved ClassMasterID:', currentClassMasterId);

    if (!currentClassMasterId) {
        console.error('❌ No Class Master ID found!');
        return;
    }

    // 2. Check Template
    console.log('\n2. Fetching Template...');
    const templateRes = await getApplicableTemplate(studentId, academicYearId, semester);
    if (!templateRes.success || !templateRes.data) {
        console.error('❌ Template loading failed:', templateRes.error);
        return;
    }

    const tpl = templateRes.data;
    console.log('   Template Name:', tpl.name);
    console.log('   Sections:', tpl.sections.length);

    // 3. Test Resolution for First Section Item
    if (tpl.sections.length > 0) {
        const section = tpl.sections[0];
        console.log(`\n3. Testing Resolution for Section "${section.name}"...`);
        if (section.items && section.items.length > 0) {
            const item = section.items[0];
            console.log('   Item:', JSON.stringify(item, null, 2));

            const resolved = await resolveSectionItems(item, currentClassMasterId, semester);
            console.log('   Resolution Result:', JSON.stringify(resolved, null, 2));

            if (resolved.data?.length === 0) {
                console.log('   ⚠️ Resolved data is EMPTY. Checking potential reasons...');
                console.log(`   - Material Category ID: ${item.material_category_id}`);
                console.log(`   - Class Master ID: ${currentClassMasterId}`);
                console.log(`   - Semester: ${semester}`);
            }
        } else {
            console.log('   ⚠️ Section has no items.');
        }
    }
}

debugResolution();
