# User Story: Candidate Onboarding and Management System

**As a** Recruiter/Recruitment Manager,
**I want** an efficient, streamlined candidate onboarding and management system,
**So that** I can securely verify candidate contact information, collect necessary background details, and maintain an organized, actionable pipeline of applicants.

## Acceptance Criteria

1. **Secure Onboarding**: Candidates can register and securely verify their email and phone number through distinct OTP flows before proceeding with detailed application submission.
2. **Comprehensive Data Collection**: Candidates can manually fill out all required background, educational, and experience information in a structured, multi-step process.
3. **Optimized Pipeline Management**: Recruiters have a centralized dashboard to view, manage, filter, and bulk-process (export/import) all registered candidate data.
4. **Data Integrity & Validation**: All user inputs (phone, email, etc.) are strictly validated to ensure data accuracy and quality within the system.

---

# Implementation Plan

To bring this vision to life, we will follow the steps outlined below:

### Phase 1: Authentication & Onboarding Refinement
- **Update Flow**: Implement the requested change to the OTP flow (Phone OTP first, then Email OTP).
- **Validation**: Implement strict validation for phone (Indian format, max 10 digits) and email fields across onboarding steps.
- **Form Enhancements**: Update the multi-step form to ensure all fields are mandatory (except skills) and clearly labeled, including DOB, address, skills, qualification, audit experience, and resume upload.

### Phase 2: Feature Development
- **Tag-based Location Input**: Implement the "Preferred Location" field to behave as a tag-based input (auto-complete or manual entry) with a limit of 10 locations.
- **Submission Logic**: Refactor the submission flow to replace the "Verify" button with a single, unified "Submit" button, including error handling on specific invalid fields.

### Phase 3: Dashboard & Persistence
- **State Management**: Ensure data persistence remains robust as we scale from `localStorage` to a potential backend database.
- **Recruiter Dashboard**: Maintain the existing dashboard's ability to filter and bulk-download/upload candidate data, ensuring it reflects the newly collected fields from Phase 1 & 2.

### Phase 4: Quality Assurance
- **Validation Testing**: Run through the onboarding flow to verify all validations, OTP logic, and error messaging.
- **Deployment & Verification**: Final build and linting check.
