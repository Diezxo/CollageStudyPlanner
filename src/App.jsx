import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle, Lock, Unlock, GraduationCap, BookOpen, AlertCircle, Calendar, Settings, ChevronDown, ChevronUp, Sparkles, BrainCircuit, Lightbulb, Flame, Clock, RefreshCw, Menu, X, Upload, Save, Trash2, FileText, Loader2, Trophy, Star, TrendingUp, Calculator, Building2, SkipForward } from 'lucide-react';

// --- CONFIGURACIÓN DE API ---
const apiKey = import.meta.env?.VITE_GEMINI_API || "";

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// Función auxiliar para llamar al servicio inteligente
async function callSmartService(prompt, fileData = null) {
    if (!apiKey) {
        alert("⚠️ Faltan credenciales. Asegúrate de crear el archivo .env con tu VITE_GEMINI_API_KEY.");
        return "Error: Falta API Key";
    }

    try {
        const parts = [{ text: prompt }];
        if (fileData) {
            parts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.base64 } });
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Detalles del error API:", errorData);
            throw new Error(`Error ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar respuesta.";
    } catch (error) {
        console.error("Error conectando con el servicio:", error);
        throw error;
    }
}

// --- SISTEMAS DE CALIFICACIÓN ---
const UNIVERSITY_CONFIG = {
    'UASD': {
        name: 'UASD',
        type: 'numeric',
        min: 0,
        max: 100,
        allowsAusente: true,
        calculatePoints: (grade) => {
            if (!grade || grade === 'AUS') return 0;
            const n = parseFloat(grade);
            if (isNaN(n)) return 0;
            if (n >= 90) return 4;
            if (n >= 80) return 3;
            if (n >= 70) return 2;
            if (n >= 60) return 1;
            return 0;
        },
        getLabel: (grade) => (!grade ? 'AP' : grade === 'AUS' ? 'Ausente' : grade)
    },
    'OYM': {
        name: 'O&M',
        type: 'numeric',
        min: 0,
        max: 100,
        allowsAusente: true,
        calculatePoints: (grade) => {
            if (!grade || grade === 'AUS') return 0;
            const n = parseFloat(grade);
            if (isNaN(n)) return 0;
            if (n >= 90) return 4;
            if (n >= 80) return 3;
            if (n >= 75) return 2;
            if (n >= 70) return 1;
            return 0;
        },
        getLabel: (grade) => (!grade ? 'AP' : grade === 'AUS' ? 'Ausente' : grade)
    },
    'PUCMM': {
        name: 'PUCMM',
        type: 'letter',
        options: ['A', 'B', 'C', 'D', 'F'],
        calculatePoints: (grade) => {
            if (!grade) return 0;
            const map = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
            return map[grade] || 0;
        },
        getLabel: (grade) => grade || 'AP'
    }
};

// --- DATOS POR DEFECTO ---
// --- DATOS POR DEFECTO (ING. MECÁNICA) ---
const DEFAULT_SUBJECTS_DATA = [
    // Semestre 1
    { id: 'DOP-1000', name: 'Orientación Institucional', credits: 1, prereqs: [] },
    { id: 'EFS-0110', name: 'Educación Física', credits: 1, prereqs: [] },
    { id: 'FIL-0110', name: 'Int a la Filosofía', credits: 3, prereqs: [] },
    { id: 'FIS-0140', name: 'Física Básica', credits: 4, prereqs: [] },
    { id: 'HIS-0110', name: 'Fund de Hist Social Dom', credits: 3, prereqs: [] },
    { id: 'IEM-2710', name: 'Campo De La IEM', credits: 2, prereqs: [] },
    { id: 'LET-0110', name: 'Lengua Española I', credits: 3, prereqs: [] },
    { id: 'MAT-0140', name: 'Matemática Básica', credits: 4, prereqs: [] },
    { id: 'QUI-0140', name: 'Química Básica', credits: 3, prereqs: [] },
    // Semestre 2
    { id: 'ARQ-1210', name: 'Geometría Descriptiva', credits: 3, prereqs: [] },
    { id: 'FIS-2110', name: 'Física General I', credits: 3, prereqs: ['FIS-0140', 'MAT-0140'] },
    { id: 'FIS-2210', name: 'Lab Física General I', credits: 1, prereqs: ['FIS-0140', 'MAT-0140'] },
    { id: 'LET-0120', name: 'Lengua Española II', credits: 3, prereqs: ['LET-0110'] },
    { id: 'MAT-2300', name: 'Álgebra Superior', credits: 5, prereqs: ['MAT-0140'] },
    { id: 'MAT-2510', name: 'Cálculo y Analítica I', credits: 6, prereqs: ['MAT-2300'] },
    { id: 'SOC-0110', name: 'Int a las Ciencias Sociales', credits: 2, prereqs: [] },
    // Semestre 3
    { id: 'ARQ-1060', name: 'Dibujo Técnico I-G', credits: 4, prereqs: ['ARQ-1210'] },
    { id: 'BIO-0140', name: 'Biología Básica', credits: 3, prereqs: [] },
    { id: 'FIS-2120', name: 'Física General II', credits: 3, prereqs: ['FIS-2110', 'FIS-2210'] },
    { id: 'FIS-2220', name: 'Lab Física General II', credits: 1, prereqs: ['FIS-2110', 'FIS-2210'] },
    { id: 'MAT-3500', name: 'Cálculo y Analítica II', credits: 6, prereqs: ['MAT-2510', 'MAT-2300'] },
    { id: 'MAT-3700', name: 'Calc Vect y Álg Matricial', credits: 5, prereqs: ['MAT-2510'] },
    // Semestre 4
    { id: 'CIV-2010', name: 'Mecánica Racional I', credits: 5, prereqs: ['FIS-2120', 'MAT-3700'] },
    { id: 'EST-1210', name: 'Estadística Industrial', credits: 3, prereqs: ['MAT-2300', 'MAT-0140'] },
    { id: 'FIS-2150', name: 'Física General III', credits: 5, prereqs: ['FIS-2120', 'FIS-2220'] },
    { id: 'FIS-2250', name: 'Lab Física General III', credits: 2, prereqs: ['FIS-2120', 'FIS-2220'] },
    { id: 'MAT-3600', name: 'Ecuaciones Diferenciales', credits: 5, prereqs: ['MAT-3500'] },
    { id: 'QUI-1110', name: 'Química Inorgánica', credits: 5, prereqs: ['QUI-0140'] },
    // Semestre 5
    { id: 'CIV-2020', name: 'Mecánica Racional II', credits: 5, prereqs: ['CIV-2010', 'MAT-3600'] },
    { id: 'ECN-1100', name: 'Nociones de Economía', credits: 3, prereqs: [] },
    { id: 'FIL-1240', name: 'Metodología Inv Cientif', credits: 3, prereqs: ['FIL-0110'] },
    { id: 'IEM-2020', name: 'Electrotecnia General', credits: 3, prereqs: ['FIS-2150', 'MAT-3600'] },
    { id: 'IEM-2030', name: 'Lab Electrotecnia Gral', credits: 1, prereqs: ['FIS-2150'] },
    { id: 'INF-1010', name: 'Int Al Proc de Datos', credits: 4, prereqs: ['MAT-0140'] },
    { id: 'MAT-3710', name: 'Met Matemáticos Para Ing', credits: 5, prereqs: ['MAT-3600'] },
    // Semestre 6
    { id: 'IEM-2050', name: 'Fundamentos de Electrónica', credits: 3, prereqs: ['IEM-2020'] },
    { id: 'IEM-2060', name: 'Lab Fund. Electrónica', credits: 1, prereqs: ['IEM-2020'] },
    { id: 'IEM-3310', name: 'Ciencia de Los Materiales', credits: 3, prereqs: ['FIS-2150', 'QUI-1110'] },
    { id: 'IEM-3470', name: 'Mecánica de Materiales I', credits: 4, prereqs: ['CIV-2010', 'MAT-3600'] },
    { id: 'IEM-3490', name: 'Dibujo Mecánico', credits: 4, prereqs: ['ARQ-1060', 'CIV-2020'] },
    { id: 'IEM-3500', name: 'Mediciones Mecánicas', credits: 2, prereqs: ['CIV-2020', 'FIS-2150'] },
    { id: 'IEM-3650', name: 'Termodinámica I', credits: 4, prereqs: ['CIV-2010', 'MAT-3600', 'QUI-1110'] },
    { id: 'IEM-3670', name: 'Lab Termodinámica I', credits: 1, prereqs: ['CIV-2010', 'MAT-3600', 'QUI-1110'] },
    { id: 'PSI-1340', name: 'Psicología Industrial', credits: 3, prereqs: [] },
    // Semestre 7
    { id: 'IEM-3260', name: 'Mecánica de Fluidos I', credits: 4, prereqs: ['CIV-2020', 'MAT-3600', 'IEM-3650'] },
    { id: 'IEM-3320', name: 'Procesos de Manufactura I', credits: 2, prereqs: ['IEM-3310', 'IEM-3470', 'IEM-3490'] },
    { id: 'IEM-3350', name: 'Lab Metalurgia Física', credits: 1, prereqs: ['IEM-3310'] },
    { id: 'IEM-3360', name: 'Laboratorio de Fundición', credits: 1, prereqs: ['IEM-3310'] },
    { id: 'IEM-3430', name: 'Mecanismos', credits: 4, prereqs: ['IEM-3470', 'IEM-3490'] },
    { id: 'IEM-3480', name: 'Mecánica de Materiales II', credits: 4, prereqs: ['IEM-3470'] },
    { id: 'IEM-3660', name: 'Termodinámica II', credits: 4, prereqs: ['IEM-3650', 'IEM-3670'] },
    { id: 'IEM-3680', name: 'Lab Termodinámica II', credits: 1, prereqs: ['IEM-3650', 'IEM-3670'] },
    { id: 'IEM-4270', name: 'Metalurgia Física I', credits: 3, prereqs: ['IEM-3310'] },
    { id: 'IEM-4330', name: 'Laboratorio de Soldadura', credits: 1, prereqs: ['IEM-3310'] },
    // Semestre 8
    { id: 'IEM-3620', name: 'Transferencia de Calor', credits: 3, prereqs: ['IEM-3660', 'IEM-3680'] },
    { id: 'IEM-3690', name: 'Lab Transf de Calor', credits: 1, prereqs: ['IEM-3660', 'IEM-3680'] },
    { id: 'IEM-4080', name: 'Téc. Programación Aplic', credits: 3, prereqs: ['INF-1010', 'MAT-3710'] },
    { id: 'IEM-4220', name: 'Diseño de Máquinas I', credits: 5, prereqs: ['IEM-3430', 'IEM-3480', 'IEM-3320'] },
    { id: 'IEM-4240', name: 'Mecánica de Fluidos II', credits: 4, prereqs: ['IEM-3260'] },
    { id: 'IEM-4250', name: 'Lab Mecánica de Fluidos', credits: 1, prereqs: ['IEM-3260'] },
    { id: 'IEM-4280', name: 'Metalurgia Física II', credits: 3, prereqs: ['IEM-4270'] },
    { id: 'IEM-4340', name: 'Procesos de Manufactura II', credits: 2, prereqs: ['IEM-3320'] },
    { id: 'IEM-4360', name: 'Lab Máquinas-Herramientas', credits: 2, prereqs: ['IEM-3320'] },
    { id: 'INQ-4610', name: 'Ingeniería Económica', credits: 3, prereqs: ['ECN-1100', 'MAT-3600'] },
    // Semestre 9
    { id: 'ADM-1120', name: 'Principios Administración', credits: 3, prereqs: [] },
    { id: 'IEM-4160', name: 'Máquinas Eléctricas', credits: 3, prereqs: ['IEM-2020'] },
    { id: 'IEM-4170', name: 'Lab Máquinas Eléctricas', credits: 1, prereqs: ['IEM-2020'] },
    { id: 'IEM-4530', name: 'Servomec y Controles', credits: 3, prereqs: ['IEM-2050'] },
    { id: 'IEM-5230', name: 'Diseño de Máquinas II', credits: 5, prereqs: ['IEM-4220'] },
    { id: 'IEM-5680', name: 'Plantas de Vapor', credits: 5, prereqs: ['IEM-3660', 'IEM-4240'] },
    // Semestre 10
    { id: 'DER-1190', name: 'Legislación y Ética Prof', credits: 2, prereqs: [] },
    { id: 'IEM-4410', name: 'Vibraciones Mecánicas', credits: 3, prereqs: ['IEM-3480', 'MAT-3710', 'IEM-5230'] },
    { id: 'IEM-5420', name: 'Diseño Instalaciones Mec', credits: 3, prereqs: ['IEM-5230', 'IEM-3430'] },
    { id: 'IEM-5720', name: 'Producción Industrial', credits: 3, prereqs: ['ADM-1120', 'INQ-4610', 'IEM-4530'] },
    { id: 'IEM-OPT',  name: 'Optativas (6 Créditos)', credits: 6, prereqs: [] },
    { id: 'IEM-7300', name: 'Tesis de Grado', credits: 8, prereqs: ['IEM-5230', 'IEM-5680', 'IEM-5720'] }
];

// --- LISTA DE LOGROS ---
const ACHIEVEMENTS_LIST = [
    { id: 'novato', name: 'Primeros Pasos', desc: 'Completa tu primera materia', icon: '🌱', condition: (completed) => completed.size >= 1 },
    { id: 'semestre1', name: 'Sobreviviente', desc: 'Completa 5 materias', icon: '🛡️', condition: (completed) => completed.size >= 5 },
    { id: 'calculo', name: 'Mente Matemática', desc: 'Aprueba Cálculo I y II', icon: '🧮', condition: (completed) => completed.has('MAT-2510') && completed.has('MAT-3500') },
    { id: 'ecuador', name: 'Medio Camino', desc: 'Completa el 50% de la carrera', icon: '🚩', condition: (completed, total) => completed.size >= total / 2 },
];

const App = () => {
    // Estados Persistentes
    const [subjectsData, setSubjectsData] = useState(() => JSON.parse(localStorage.getItem('ingsys_subjects_data')) || DEFAULT_SUBJECTS_DATA);
    const [completed, setCompleted] = useState(() => new Set(JSON.parse(localStorage.getItem('ingsys_completed')) || []));
    const [grades, setGrades] = useState(() => JSON.parse(localStorage.getItem('ingsys_grades')) || {});
    const [careerName, setCareerName] = useState(() => localStorage.getItem('ingsys_career_name') || "Ingeniería Mecánica");
    const [selectedUniversity, setSelectedUniversity] = useState(() => localStorage.getItem('ingsys_university') || 'UASD');

    // --- NUEVO: Estado para materias por semestre ---
    const [subjectsPerSemester, setSubjectsPerSemester] = useState(() => Number(localStorage.getItem('ingsys_subjects_per_sem')) || 5);

    // Efectos de Guardado
    useEffect(() => localStorage.setItem('ingsys_subjects_data', JSON.stringify(subjectsData)), [subjectsData]);
    useEffect(() => localStorage.setItem('ingsys_completed', JSON.stringify([...completed])), [completed]);
    useEffect(() => localStorage.setItem('ingsys_grades', JSON.stringify(grades)), [grades]);
    useEffect(() => localStorage.setItem('ingsys_career_name', careerName), [careerName]);
    useEffect(() => localStorage.setItem('ingsys_university', selectedUniversity), [selectedUniversity]);
    useEffect(() => localStorage.setItem('ingsys_subjects_per_sem', subjectsPerSemester), [subjectsPerSemester]);

    // Estados UI
    const [activeTab, setActiveTab] = useState('available');
    const [showSettings, setShowSettings] = useState(false);
    const [showCareerModal, setShowCareerModal] = useState(false);
    const [showGradeModal, setShowGradeModal] = useState(null);
    const [showPlannerModal, setShowPlannerModal] = useState(false);
    const [gradeInputValue, setGradeInputValue] = useState("");
    const [suggestedSchedule, setSuggestedSchedule] = useState(null); // Estado para el horario sugerido

    // Estados IA & Archivos
    const [careerAdvice, setCareerAdvice] = useState(null);
    const [studyPlan, setStudyPlan] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [parsingError, setParsingError] = useState(null);
    const fileInputRef = useRef(null);

    // --- LÓGICA DE GPA ---
    const calculateGPA = useMemo(() => {
        let totalPoints = 0;
        let totalCredits = 0;
        const config = UNIVERSITY_CONFIG[selectedUniversity];

        Object.entries(grades).forEach(([id, grade]) => {
            if (grade !== null && grade !== undefined) {
                const subject = subjectsData.find(s => s.id === id);
                if (subject) {
                    const points = config.calculatePoints(grade);
                    totalPoints += points * subject.credits;
                    totalCredits += subject.credits;
                }
            }
        });
        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    }, [grades, subjectsData, selectedUniversity]);

    // --- LÓGICA DE PROGRESO ---
    const getDependencyWeight = useMemo(() => {
        const memo = {};
        const calculateWeight = (id) => {
            if (memo[id] !== undefined) return memo[id];
            const directDependents = subjectsData.filter(s => s.prereqs.includes(id));
            let weight = directDependents.length;
            directDependents.forEach(dep => weight += calculateWeight(dep.id));
            memo[id] = weight;
            return weight;
        };
        const weights = {};
        subjectsData.forEach(s => weights[s.id] = calculateWeight(s.id));
        return weights;
    }, [subjectsData]);

    const subjectsStatus = useMemo(() => {
        return subjectsData.map(subject => {
            const isCompleted = completed.has(subject.id);
            const missingPrereqs = subject.prereqs.filter(p => !completed.has(p));
            const isLocked = !isCompleted && missingPrereqs.length > 0;
            const isAvailable = !isCompleted && !isLocked;
            const weight = getDependencyWeight[subject.id] || 0;
            const isHighPriority = isAvailable && (weight > 4 || subject.credits >= 5);
            const rawGrade = grades[subject.id];
            const config = UNIVERSITY_CONFIG[selectedUniversity];
            const gradeLabel = isCompleted ? config.getLabel(rawGrade) : null;

            return { ...subject, isCompleted, isLocked, isAvailable, missingPrereqs, weight, isHighPriority, grade: gradeLabel, rawGrade };
        });
    }, [completed, getDependencyWeight, subjectsData, grades, selectedUniversity]);

    // Filtrado
    const availableList = subjectsStatus.filter(s => s.isAvailable);
    const lockedList = subjectsStatus.filter(s => s.isLocked);
    const completedList = subjectsStatus.filter(s => s.isCompleted);

    // --- NUEVO: Cálculos de Tiempo ---
    const remainingSubjectsCount = subjectsStatus.filter(s => !s.isCompleted).length;
    const estimatedSemesters = remainingSubjectsCount > 0 ? Math.ceil(remainingSubjectsCount / subjectsPerSemester) : 0;

    // --- NUEVO: Generador de Horario ---
    const generateSchedule = () => {
        // Ordenar disponibles por: 1. Prioridad (Peso), 2. Créditos
        const sorted = [...availableList].sort((a, b) => b.weight - a.weight || b.credits - a.credits);
        // Tomar los primeros N según configuración
        const suggested = sorted.slice(0, subjectsPerSemester);
        setSuggestedSchedule(suggested);
        setActiveTab('available');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Manejo de acciones
    const handleToggleAttempt = (id) => {
        if (completed.has(id)) {
            const newCompleted = new Set(completed);
            newCompleted.delete(id);
            setCompleted(newCompleted);
            const newGrades = { ...grades };
            delete newGrades[id];
            setGrades(newGrades);
            setSuggestedSchedule(null); // Resetear sugerencia si cambia el estado
        } else {
            setGradeInputValue("");
            setShowGradeModal(id);
        }
    };

    const confirmGrade = (id, grade) => {
        const newCompleted = new Set(completed);
        newCompleted.add(id);
        setCompleted(newCompleted);
        setGrades({ ...grades, [id]: grade });
        setShowGradeModal(null);
        setSuggestedSchedule(null);
    };

    // Importador PDF
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsParsingPdf(true);
        setParsingError(null);
        try {
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const prompt = `Analiza este PDF. Extrae TODAS las asignaturas en JSON Array puro. Estructura: [{ "id": "CLAVE", "name": "Nombre", "credits": 4, "prereqs": ["REQ1"] }]. Sin markdown.`;
            const resultText = await callSmartService(prompt, { mimeType: file.type, base64: base64Data });

            const firstBracket = resultText.indexOf('[');
            const lastBracket = resultText.lastIndexOf(']');
            if (firstBracket === -1) throw new Error("Datos no encontrados.");
            const parsedData = JSON.parse(resultText.substring(firstBracket, lastBracket + 1));

            if (!Array.isArray(parsedData)) throw new Error("Formato incorrecto.");

            let finalData = parsedData;
            if (parsedData[0].careerName) setCareerName(parsedData[0].careerName);
            else setCareerName("Carrera Importada");

            setSubjectsData(finalData);
            setCompleted(new Set()); setGrades({}); setSuggestedSchedule(null);
            setShowSettings(false);
            alert(`¡Éxito! ${parsedData.length} materias importadas.`);
        } catch (error) {
            console.error(error);
            setParsingError(error.message || "Error procesando.");
        } finally {
            setIsParsingPdf(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Funciones IA
    const handleCareerAdvice = async () => {
        setShowCareerModal(true);
        if (careerAdvice) return;
        setIsGenerating(true);
        const names = completedList.map(s => s.name).join(", ");
        const prompt = `Estudiante de ${careerName}. Completado: ${names}. Sugiere 3 roles profesionales.`;
        const result = await callSmartService(prompt);
        setCareerAdvice(result);
        setIsGenerating(false);
    };

    const handleStudyPlan = async (hours) => {
        setIsGenerating(true);
        const subjects = availableList.sort((a, b) => b.weight - a.weight).slice(0, 5).map(s => s.name).join(", ");
        const prompt = `Tengo ${hours}h/día. Materias: ${subjects}. Rutina semanal.`;
        const result = await callSmartService(prompt);
        setStudyPlan(result);
        setIsGenerating(false);
    };

    const unlockedAchievements = ACHIEVEMENTS_LIST.filter(ach => ach.condition(completed, subjectsData.length));
    const currentUniversityConfig = UNIVERSITY_CONFIG[selectedUniversity];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 md:pb-0">

            {/* HEADER */}
            <div className="bg-blue-900 text-white shadow-lg sticky top-0 z-30">
                <div className="max-w-5xl mx-auto p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                                <GraduationCap className="text-yellow-400" /> Ingeniero Pro
                            </h1>
                            <div className="flex items-center gap-2 text-blue-200 text-xs mt-1">
                                <span>{careerName}</span>
                                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                <span className="flex items-center gap-1"><Building2 size={10}/> {currentUniversityConfig.name}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowSettings(true)} className="p-2 bg-blue-800 rounded-lg hover:bg-blue-700"><Settings size={20}/></button>
                            <div className="bg-blue-800 px-3 py-1 rounded-lg text-right border border-blue-700 min-w-[80px]">
                                <div className="text-xs text-blue-300">Índice</div>
                                <div className={`font-bold text-lg ${parseFloat(calculateGPA) >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>{calculateGPA}</div>
                            </div>
                        </div>
                    </div>

                    {/* --- PANEL DE CONTROL RESTAURADO --- */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-blue-800/50 p-3 rounded-xl border border-blue-700/50 mb-4 backdrop-blur-sm">

                        {/* Estimación de Tiempo */}
                        <div className="flex items-center gap-2 text-sm font-medium min-w-[140px]">
                            <Calendar className="w-4 h-4 text-blue-300" />
                            <span>{estimatedSemesters} Semestres rest.</span>
                        </div>

                        {/* Selector Materias por Semestre */}
                        <div className="flex items-center gap-2 bg-blue-900/60 px-2 py-1.5 rounded-lg border border-blue-700">
                            <span className="text-xs text-blue-300">Materias/Sem:</span>
                            <select
                                value={subjectsPerSemester}
                                onChange={(e) => setSubjectsPerSemester(Number(e.target.value))}
                                className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer appearance-none pr-4 relative z-10"
                                style={{ backgroundImage: 'none' }}
                            >
                                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} className="text-slate-900">{n}</option>)}
                            </select>
                            <ChevronDown size={12} className="text-blue-300 -ml-4 pointer-events-none" />
                        </div>

                        <div className="flex-grow"></div>

                        {/* Botón Armar Horario */}
                        <button
                            onClick={generateSchedule}
                            className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-blue-900 font-bold px-4 py-1.5 rounded-lg shadow-lg flex justify-center items-center gap-2 text-sm transition-all active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Armar Próximo Semestre
                        </button>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1 text-blue-200">
                            <span>{completedList.length} / {subjectsData.length} Materias</span>
                            <span>{Math.round((completedList.length / subjectsData.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-blue-950 rounded-full h-2 overflow-hidden">
                            <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(completedList.length / subjectsData.length) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                        <button onClick={() => setShowPlannerModal(true)} className="bg-indigo-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap shadow-lg active:scale-95 hover:bg-indigo-500">
                            <Calendar size={16} /> Planificador
                        </button>
                        <button onClick={handleCareerAdvice} className="bg-purple-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap shadow-lg active:scale-95 hover:bg-purple-500">
                            <Sparkles size={16} /> Orientación
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-5xl mx-auto p-4 md:p-6">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
                    <TabButton active={activeTab === 'available'} onClick={() => setActiveTab('available')} icon={Unlock} label={`Disponibles (${availableList.length})`} color="green" />
                    <TabButton active={activeTab === 'locked'} onClick={() => setActiveTab('locked')} icon={Lock} label="Bloqueadas" color="slate" />
                    <TabButton active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} icon={CheckCircle} label="Historial" color="blue" />
                    <TabButton active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')} icon={Trophy} label="Logros" color="yellow" />
                </div>

                <div className="min-h-[50vh]">
                    {activeTab === 'available' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">

                            {/* --- SECCIÓN HORARIO SUGERIDO RESTAURADA --- */}
                            {suggestedSchedule && (
                                <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-xl relative overflow-hidden shadow-sm animate-in zoom-in-95">
                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                        <div>
                                            <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
                                                <span className="bg-green-600 text-white p-1 rounded-full"><CheckCircle size={14}/></span>
                                                Sugerencia Óptima
                                            </h2>
                                            <p className="text-xs text-green-700 mt-1">Basado en ruta crítica y tu límite de {subjectsPerSemester} materias.</p>
                                        </div>
                                        <button onClick={() => setSuggestedSchedule(null)} className="p-2 -mr-2 text-green-600 hover:bg-green-100 rounded-full"><X size={16}/></button>
                                    </div>
                                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
                                        {suggestedSchedule.map(s => (
                                            <div key={s.id} className="bg-white p-3 rounded-lg border border-green-100 shadow-sm flex items-center justify-between">
                                                <span className="font-semibold text-sm text-slate-700 truncate w-3/4">{s.name}</span>
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono">{s.credits} CR</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-green-200 text-right">
                                        <span className="text-xs font-bold text-green-800">Total Créditos: {suggestedSchedule.reduce((acc, curr) => acc + curr.credits, 0)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Listas normales */}
                            {availableList.some(s => s.isHighPriority) && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Flame size={14} /> Prioridad Crítica
                                    </h3>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        {availableList.filter(s => s.isHighPriority).map(s => (
                                            <SubjectCard key={s.id} subject={s} onToggle={() => handleToggleAttempt(s.id)} careerName={careerName} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Clock size={14} /> Materias Flexibles
                            </h3>
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                {availableList.filter(s => !s.isHighPriority).map(s => (
                                    <SubjectCard key={s.id} subject={s} onToggle={() => handleToggleAttempt(s.id)} careerName={careerName} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ... Resto de Tabs igual ... */}
                    {activeTab === 'locked' && (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {lockedList.map(s => <SubjectCard key={s.id} subject={s} onToggle={() => handleToggleAttempt(s.id)} careerName={careerName} />)}
                        </div>
                    )}

                    {activeTab === 'completed' && (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {completedList.map(s => <SubjectCard key={s.id} subject={s} onToggle={() => handleToggleAttempt(s.id)} careerName={careerName} />)}
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {ACHIEVEMENTS_LIST.map(ach => {
                                const unlocked = unlockedAchievements.some(u => u.id === ach.id);
                                return (
                                    <div key={ach.id} className={`p-4 rounded-xl border flex items-center gap-4 ${unlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-100 border-slate-200 opacity-60 grayscale'}`}>
                                        <div className="text-3xl">{ach.icon}</div>
                                        <div>
                                            <h4 className={`font-bold ${unlocked ? 'text-yellow-800' : 'text-slate-500'}`}>{ach.name}</h4>
                                            <p className="text-xs text-slate-600">{ach.desc}</p>
                                        </div>
                                        {unlocked && <CheckCircle className="ml-auto text-yellow-500" size={20} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL CALIFICACIÓN --- */}
            {showGradeModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-center">Calificación ({currentUniversityConfig.name})</h3>

                        {currentUniversityConfig.type === 'letter' ? (
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {currentUniversityConfig.options.map(grade => (
                                    <button key={grade} onClick={() => confirmGrade(showGradeModal, grade)} className="p-3 rounded-lg border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 font-bold text-xl transition-all">
                                        {grade}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4 mb-4">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1 font-bold">Nota Numérica (0-100)</label>
                                    <input
                                        type="number"
                                        autoFocus
                                        placeholder="Ej: 85"
                                        value={gradeInputValue}
                                        onChange={(e) => setGradeInputValue(e.target.value)}
                                        className="w-full text-center text-3xl font-bold p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                    />
                                </div>

                                <button
                                    disabled={!gradeInputValue || gradeInputValue < 0 || gradeInputValue > 100}
                                    onClick={() => confirmGrade(showGradeModal, gradeInputValue)}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Confirmar Nota
                                </button>

                                <div className="flex gap-2">
                                    {currentUniversityConfig.allowsAusente && (
                                        <button onClick={() => confirmGrade(showGradeModal, 'AUS')} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium hover:bg-red-100 text-sm flex items-center justify-center gap-1">
                                            <AlertCircle size={14}/> Ausente
                                        </button>
                                    )}
                                    <button onClick={() => confirmGrade(showGradeModal, null)} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg font-medium hover:bg-green-100 text-sm flex items-center justify-center gap-1">
                                        <SkipForward size={14}/> Omitir
                                    </button>
                                </div>
                            </div>
                        )}

                        <button onClick={() => setShowGradeModal(null)} className="w-full py-2 text-slate-500 hover:text-slate-800 text-sm font-medium mt-2">Cancelar</button>
                    </div>
                </div>
            )}

            {/* --- MODAL CONFIGURACIÓN (con bloqueo durante carga) --- */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings size={20}/> Configuración</h3>
                            {!isParsingPdf && <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>}
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" /> Importar Nuevo Pensum (PDF)
                                </h4>
                                <div className={`bg-blue-50 p-4 rounded-xl border border-blue-100 text-center relative group ${isParsingPdf ? 'cursor-wait' : ''}`}>
                                    {isParsingPdf ? (
                                        <div className="flex flex-col items-center gap-3 py-4">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                            <p className="text-xs text-blue-600 font-semibold animate-pulse">Analizando documento...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-blue-300 mx-auto mb-2 group-hover:text-blue-500" />
                                            <p className="text-xs text-slate-500 mb-2">Sube el PDF de tu carrera.</p>
                                            <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold pointer-events-none">Seleccionar Archivo</button>
                                        </>
                                    )}
                                </div>
                                {parsingError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">{parsingError}</p>}
                            </div>

                            <div className={`space-y-4 transition-opacity ${isParsingPdf ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div>
                                    <label className="block text-sm text-slate-500 font-bold mb-2">Universidad</label>
                                    <div className="grid gap-2">
                                        {Object.keys(UNIVERSITY_CONFIG).map(uniKey => (
                                            <button key={uniKey} onClick={() => setSelectedUniversity(uniKey)} className={`w-full p-3 rounded-lg border text-left flex justify-between items-center ${selectedUniversity === uniKey ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                {UNIVERSITY_CONFIG[uniKey].name}
                                                {selectedUniversity === uniKey && <CheckCircle size={16}/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-bold hover:bg-red-100 flex items-center justify-center gap-2">
                                        <Trash2 size={16}/> Borrar Todo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- OTROS MODALES (PLANNER / CARRERA) --- */}
            {showPlannerModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold flex items-center gap-2"><Calendar className="text-indigo-600"/> Planificador</h3>
                            <button onClick={() => setShowPlannerModal(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {!studyPlan ? (
                                <div className="text-center space-y-4">
                                    <p className="text-slate-600">¿Cuántas horas al día puedes estudiar?</p>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4].map(h => <button key={h} onClick={() => handleStudyPlan(h)} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold">{h}h</button>)}
                                    </div>
                                    {isGenerating && <div className="flex items-center justify-center gap-2 text-indigo-600 mt-4"><Loader2 className="animate-spin"/> Generando...</div>}
                                </div>
                            ) : (
                                <div className="prose prose-sm max-w-none whitespace-pre-wrap">{studyPlan}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showCareerModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex gap-2"><Sparkles className="text-purple-600"/> Orientación</h3>
                            <button onClick={() => setShowCareerModal(false)}><X/></button>
                        </div>
                        {isGenerating ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-purple-600"/></div> : <div className="whitespace-pre-wrap">{careerAdvice}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componentes UI Auxiliares
const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
    <button onClick={onClick} className={`flex-none py-2 px-4 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all ${active ? `bg-${color}-600 text-white border-${color}-600 shadow-md` : `bg-white text-slate-500 border-slate-200 hover:bg-slate-50`}`}>
        <Icon size={16} /> {label}
    </button>
);

const SubjectCard = ({ subject, onToggle, careerName }) => {
    const [expanded, setExpanded] = useState(false);
    const [aiTip, setAiTip] = useState(null);
    const [loading, setLoading] = useState(false);

    const getTip = async (e) => {
        e.stopPropagation(); setExpanded(true);
        if(aiTip) return;
        setLoading(true);
        const tip = await callSmartService(`Dame 3 consejos breves para aprobar ${subject.name} en ${careerName}. Usa emojis.`);
        setAiTip(tip);
        setLoading(false);
    };

    return (
        <div className={`rounded-xl border p-3 bg-white relative group transition-all active:scale-[0.99] ${subject.isCompleted ? 'border-blue-200 bg-blue-50' : subject.isHighPriority ? 'border-orange-300 shadow-orange-100 ring-1 ring-orange-100' : 'border-slate-200'}`}>
            {subject.isHighPriority && !subject.isCompleted && <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-bl-lg font-bold flex gap-1"><Flame size={10}/> CRÍTICA</div>}

            <div className="flex items-center gap-3" onClick={() => setExpanded(!expanded)}>
                <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${subject.isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                    {subject.isCompleted ? (
                        <span className="text-[10px] font-bold leading-tight text-center">{subject.grade || <CheckCircle size={16} />}</span>
                    ) : null}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{subject.name}</div>
                    <div className="text-xs text-slate-500 flex gap-2">
                        <span className="bg-slate-100 px-1 rounded">{subject.id}</span>
                        <span>{subject.credits} CR</span>
                        {subject.isLocked && <span className="text-red-500 flex items-center gap-1"><Lock size={10}/> Bloqueada</span>}
                    </div>
                </div>
                <button onClick={getTip} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-full" title="Tips"><Lightbulb size={20}/></button>
            </div>

            {expanded && (
                <div className="mt-3 pt-3 border-t text-sm bg-slate-50/50 -mx-3 px-3 pb-2 animate-in slide-in-from-top-2">
                    {aiTip || loading ? (
                        <div className="bg-white p-2 rounded border border-indigo-100 mb-2">
                            <div className="font-bold text-indigo-600 text-xs mb-1">CONSEJOS</div>
                            {loading ? <Loader2 className="animate-spin w-4 h-4"/> : aiTip}
                        </div>
                    ) : null}
                    {subject.prereqs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            <span className="text-xs font-bold text-slate-500 mr-1">REQ:</span>
                            {subject.prereqs.map(p => <span key={p} className={`text-xs px-1 rounded border ${subject.missingPrereqs.includes(p) ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>{p}</span>)}
                        </div>
                    ) : <span className="text-xs text-slate-400 italic">Sin prerrequisitos</span>}
                </div>
            )}
        </div>
    );
};

export default App;