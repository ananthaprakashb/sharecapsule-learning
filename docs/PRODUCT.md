# ShareCapsule Prepare — Product Specification

## Product goal

Help a learner become ready for a specific outcome by a specific date. The platform should determine the target competency level, validate the learner's current condition with a diagnostic, identify gaps, and continuously adapt the preparation plan.

## Canonical URL

`https://prepare.sharecapsule.app`

## Primary user journeys

### Academic / exam

1. Select Academic / Exam preparation.
2. Enter target date.
3. Enter grade level, exam/subject, topics, curriculum/syllabus, and available study time.
4. Optionally upload study guide, syllabus, previous tests, notes, or score reports.
5. Platform creates a competency/skill map.
6. Platform asks a short adaptive diagnostic.
7. Platform estimates current proficiency per skill and identifies prerequisite gaps.
8. Platform creates a deadline-aware preparation plan.
9. Learner studies curated resources and completes micro-assessments.
10. Skill estimates and the plan update after each assessment.
11. Learner completes realistic mock assessments before the target date.

### Company / role interview

1. Select Interview preparation.
2. Enter company, role, level, interview date, and available preparation time.
3. Add job description, resume, skills, years of experience, and optional portfolio/GitHub information.
4. Platform builds a target competency model from the role and reputable public sources.
5. Platform groups publicly reported historical interview patterns and representative practice questions by competency. It must not present confidential/leaked material as authentic company questions.
6. Platform runs an adaptive diagnostic across technical, role-specific, communication, and behavioral competencies.
7. Platform generates a gap analysis and prioritized plan.
8. Learner completes practice sessions and mock interviews.
9. Platform tracks readiness and continuously reallocates preparation time.

## First-session intake

### Common fields

- preparation type
- target date
- timezone
- target outcome
- available days per week
- minutes/hours available per day
- preferred study session length
- optional notes

### Academic fields

- grade level
- subject
- exam/course/certification name
- curriculum/board when relevant
- topics to cover
- current/recent score when available
- desired score or grade
- uploaded syllabus/study guide

### Interview fields

- company
- job title
- level
- interview date
- job description
- years of experience
- primary technologies/skills
- resume
- known interview stages
- areas candidate believes are strong/weak

## Diagnostic engine

The initial diagnostic should be short enough to complete but broad enough to locate the learner on the skill graph.

Rules:

- Start with medium-difficulty questions.
- Increase difficulty after demonstrated mastery.
- Probe prerequisites after repeated failure.
- Stop testing a skill once confidence is sufficient for planning.
- Ask different response types where appropriate: multiple choice, short answer, coding, scenario, spoken response, or structured behavioral response.
- Record correctness, confidence, response time, hint usage, and rubric dimensions when available.

The result should be a proficiency distribution, not only a single score.

## Skill graph

Each target should map to competencies and prerequisites.

Example:

```text
Dynamic Programming
  -> Recursion
      -> Function calls
      -> Base cases
  -> Memoization
  -> Tabulation
  -> State design
  -> Complexity optimization
```

A weak advanced skill should trigger prerequisite validation before assigning advanced learning material.

## Gap prioritization

A practical first scoring model:

```text
priority =
  importance_to_target
  * skill_gap
  * evidence_confidence
  * improvement_potential
  / estimated_time_to_improve
```

Deadline pressure can adjust the score so that the system prefers high-return skills when time is short.

## Resource curation

Resources may include:

- official documentation
- recognized educational institutions
- reputable videos and lectures
- textbooks / open educational resources
- practice problems
- company career and engineering pages
- certification/exam provider materials
- reputable candidate-reported interview experiences

Store metadata:

- title
- URL/source
- author/publisher
- resource type
- target skills
- difficulty
- estimated duration
- publication/update date when available
- free/paid
- source quality score
- evidence/citation information

The system should recommend the smallest useful segment, not automatically the longest course.

## Learning loop

```text
Plan -> Learn -> Practice -> Micro-assessment -> Update proficiency -> Re-plan
```

After each session, update:

- current proficiency
- confidence in estimate
- time spent
- next recommended skill
- target-date feasibility

## Readiness

Readiness is an estimated preparation indicator, not a prediction of exam or hiring outcome.

Example dimensions:

- target coverage
- skill proficiency
- speed/fluency
- retention
- mock-performance consistency
- communication / behavioral quality where applicable

Always show the factors behind the readiness score.

## MVP scope

### Phase 1

- landing/intake experience
- academic vs interview flow
- target date and preparation constraints
- competency model creation
- 10–20 question diagnostic
- initial skill scores
- gap summary
- prioritized preparation plan

### Phase 2

- persisted learner profile
- adaptive diagnostics
- skill graph and prerequisites
- learning calendar
- session completion tracking

### Phase 3

- web/video/document resource discovery and ranking
- citations and source-quality controls
- micro-assessment generation
- automatic re-planning

### Phase 4

- timed mock exams
- AI mock interviewer
- coding evaluation where applicable
- behavioral-response rubric
- readiness dashboard

## Suggested technical decomposition

- Web UI
- Goal Intake API
- Target/Competency Analyzer
- Diagnostic Question Generator
- Assessment/Evaluation Service
- Learner Skill State
- Gap & Priority Engine
- Resource Research/Retrieval Service
- Planning/Scheduling Engine
- Mock Assessment/Interview Engine
- Progress/Readiness Service

Keep the learner state structured so model providers can change without rewriting the product logic.

## Safety and trust

- Cite external learning/interview evidence where possible.
- Clearly distinguish official information from community-reported experiences.
- Do not claim leaked, private, or confidential interview banks.
- Do not guarantee exam results, hiring outcomes, admission, or certification.
- Keep minors' data collection minimal and privacy-conscious.
- Avoid using self-reported confidence as the only evidence of proficiency.
