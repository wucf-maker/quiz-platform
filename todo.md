# Quiz Assessment Platform TODO

## Phase 1: Database Schema & Migration
- [x] Design and create assessments table
- [x] Design and create questions table (with type, options, correct answers, score)
- [x] Design and create student_submissions table
- [x] Design and create student_answers table
- [x] Run migration via webdev_execute_sql

## Phase 2: Backend API
- [x] Assessment CRUD procedures (create, read, update, delete)
- [x] Question CRUD within assessment
- [x] Image upload endpoint for picture-choice questions
- [x] Public procedure: get assessment by share token (no auth)
- [x] Student submission procedure (no auth required)
- [x] Get all submissions for an assessment (teacher)
- [x] Get per-question statistics (correct rate, common errors)

## Phase 3: Memphis Visual Style
- [x] Update index.css with Memphis color palette (peach bg, mint, lavender, yellow)
- [x] Add Google Fonts (Nunito Black for headings)
- [x] Create Memphis geometric decoration components
- [x] Apply global theme tokens

## Phase 4: Teacher Interface
- [x] Login page with Memphis style
- [x] Dashboard: list of assessments with actions
- [x] Create/Edit assessment form (name, description)
- [x] Question editor: add/reorder/delete questions
- [x] Single-choice question editor
- [x] Picture-choice question editor (with image upload)
- [x] Matching question editor (left-right pairs)
- [x] Fill-in-the-blank question editor
- [x] QR Code generation and display for each assessment
- [x] Copy share link button

## Phase 5: Student Interface
- [x] Public quiz entry page (accessed via QR Code / share link)
- [x] Student name input screen
- [x] Quiz taking interface with progress indicator
- [x] Single-choice question component
- [x] Picture-choice question component
- [x] Matching question component (tap to connect)
- [x] Fill-in-the-blank question component
- [x] Submit and show results with score + per-question feedback

## Phase 6: Teacher Analytics
- [x] Submissions list page (name, score, time)
- [x] Per-question correct rate bar chart
- [x] Common wrong answers display
- [x] Overall score distribution chart

## Phase 7: Integration & Polish
- [x] Write vitest tests for key API procedures (13 tests passing)
- [x] Responsive design check (mobile-friendly)
- [x] Loading states and error handling
- [x] Empty states for no submissions
- [x] Final UI polish and Memphis decorations
- [x] Save checkpoint and deliver

## Bug Fixes & New Features (Round 2)
- [x] Fix image upload failure (diagnose and repair upload endpoint)
- [x] Add CSV export for assessment results
- [x] Add PDF export for assessment results

## Bug Fixes (Round 3)
- [x] Fix image upload (switch to REST multipart/form-data instead of tRPC base64)
- [x] Fix matching question answer display in results/feedback

## SEN (Special Educational Needs) Friendly Overhaul (Round 4)
- [x] AccessibilityContext with localStorage persistence (font scale / contrast / simplified / TTS)
- [x] TTS engine wrapping SpeechSynthesis API with Chinese voice priority (zh-HK > zh-TW > zh-CN)
- [x] CSS tokens for 4 font scales (standard/large/xlarge/xxlarge) and 2 high-contrast modes
- [x] Floating AccessibilityToolbar on QuizPage (FAB + popover panel)
- [x] TTSButton on every question/option/feedback (gated by global TTS toggle)
- [x] Skip-to-main-content links for keyboard navigation
- [x] ARIA labels / roles / live regions on QuizPage and MatchingQuestion
- [x] Wrong-answer retry flow (filter to only incorrect questions, local grading, no DB write)
- [x] Simplified mode (hides Memphis decorations, removes animations)
- [x] Improved wrong-answer rendering in AssessmentResults (human-readable text for matching/picture)
