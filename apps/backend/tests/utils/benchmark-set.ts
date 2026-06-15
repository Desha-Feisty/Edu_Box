export interface BenchmarkCase {
    questionPrompt: string;
    studentAnswer: string;
    sampleAnswer?: string;
    rubric?: string;
    maxPoints: number;
    expectedScoreRange: [number, number]; // [min, max] acceptable range
    description: string;
}

export const GRADING_BENCHMARKS: BenchmarkCase[] = [
    {
        questionPrompt: "Explain the process of photosynthesis in plants.",
        studentAnswer: "Photosynthesis is when plants convert sunlight, water, and CO2 into glucose and oxygen. Chlorophyll in chloroplasts captures light energy.",
        sampleAnswer: "Photosynthesis in plants is the biological process where green plants convert carbon dioxide and water into glucose and oxygen using sunlight energy. The process occurs in chloroplasts where chlorophyll captures light energy. It has two main stages: light-dependent reactions (producing ATP and NADPH) and light-independent reactions/Calvin cycle (fixing CO2 into glucose).",
        rubric: "Must mention: chloroplasts, chlorophyll, light energy, CO2, water, glucose, oxygen. Bonus for mentioning light-dependent and Calvin cycle.",
        maxPoints: 5,
        expectedScoreRange: [4, 5],
        description: "Complete, accurate answer with key terms",
    },
    {
        questionPrompt: "Explain the process of photosynthesis in plants.",
        studentAnswer: "Plants make food from sunlight.",
        sampleAnswer: "Photosynthesis in plants is the biological process where green plants convert carbon dioxide and water into glucose and oxygen using sunlight energy. The process occurs in chloroplasts where chlorophyll captures light energy.",
        rubric: "Must mention: chloroplasts, chlorophyll, light energy, CO2, water, glucose, oxygen.",
        maxPoints: 5,
        expectedScoreRange: [1, 2],
        description: "Vague answer missing key details",
    },
    {
        questionPrompt: "What is the capital of France?",
        studentAnswer: "Paris",
        sampleAnswer: "Paris",
        rubric: "Exact match required",
        maxPoints: 1,
        expectedScoreRange: [1, 1],
        description: "Simple factual question - exact answer",
    },
    {
        questionPrompt: "What is the capital of France?",
        studentAnswer: "London",
        sampleAnswer: "Paris",
        rubric: "Exact match required",
        maxPoints: 1,
        expectedScoreRange: [0, 0],
        description: "Simple factual question - wrong answer",
    },
    {
        questionPrompt: "Describe the causes of World War I.",
        studentAnswer: "The main causes were militarism, alliances, imperialism, and nationalism (MAIN). The assassination of Archduke Franz Ferdinand was the trigger.",
        sampleAnswer: "World War I was caused by four main factors (MAIN): Militarism (arms race), Alliances (entangling treaties), Imperialism (colonial competition), and Nationalism (ethnic tensions). The immediate trigger was the assassination of Archduke Franz Ferdinand of Austria-Hungary by a Serbian nationalist in June 1914.",
        rubric: "Must mention MAIN acronym or all four causes. Must mention assassination as trigger.",
        maxPoints: 4,
        expectedScoreRange: [3, 4],
        description: "Complete historical answer with MAIN framework",
    },
    {
        questionPrompt: "Describe the causes of World War I.",
        studentAnswer: "Countries fought because they didn't like each other.",
        sampleAnswer: "World War I was caused by four main factors (MAIN): Militarism, Alliances, Imperialism, and Nationalism. The trigger was the assassination of Archduke Franz Ferdinand.",
        rubric: "Must mention MAIN acronym or all four causes. Must mention assassination as trigger.",
        maxPoints: 4,
        expectedScoreRange: [0, 1],
        description: "Overly simplistic answer",
    },
    {
        questionPrompt: "Solve for x: 2x + 5 = 15",
        studentAnswer: "x = 5",
        sampleAnswer: "Subtract 5 from both sides: 2x = 10. Divide by 2: x = 5.",
        rubric: "Correct answer (x=5) gets full points. Showing work is bonus but not required.",
        maxPoints: 2,
        expectedScoreRange: [2, 2],
        description: "Math problem - correct answer",
    },
    {
        questionPrompt: "Solve for x: 2x + 5 = 15",
        studentAnswer: "x = 10",
        sampleAnswer: "Subtract 5 from both sides: 2x = 10. Divide by 2: x = 5.",
        rubric: "Correct answer (x=5) gets full points.",
        maxPoints: 2,
        expectedScoreRange: [0, 0],
        description: "Math problem - wrong answer",
    },
    {
        questionPrompt: "Compare and contrast mitosis and meiosis.",
        studentAnswer: "Mitosis makes identical cells for growth. Meiosis makes gametes with half chromosomes. Mitosis has 1 division, meiosis has 2.",
        sampleAnswer: "Mitosis: produces 2 genetically identical diploid cells, used for growth and repair, 1 division. Meiosis: produces 4 genetically unique haploid gametes, used for sexual reproduction, 2 divisions (Meiosis I and II), includes crossing over.",
        rubric: "Must mention: identical vs unique, diploid vs haploid, 1 vs 2 divisions, purpose (growth vs reproduction). Bonus for crossing over.",
        maxPoints: 5,
        expectedScoreRange: [3, 4],
        description: "Good comparison with key differences",
    },
];

export function getBenchmarkCases(): BenchmarkCase[] {
    return GRADING_BENCHMARKS;
}