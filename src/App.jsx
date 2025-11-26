import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle, Lock, Unlock, GraduationCap, BookOpen, AlertCircle, Calendar, Settings, ChevronDown, ChevronUp, Sparkles, BrainCircuit, Lightbulb, Flame, Clock, RefreshCw, Menu, X, Upload, Save, Trash2, FileText, Loader2 } from 'lucide-react';

// --- CONFIGURACIÓN DE GEMINI API ---
const apiKey = import.meta.env.VITE_GEMINI_API;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// Función mejorada para soportar Texto e Imágenes/PDFs (Multimodal)
async function callGemini(prompt, fileData = null) {
    try {
        const parts = [{ text: prompt }];

        // Si hay archivo (PDF/Imagen), lo agregamos al payload
        if (fileData) {
            parts.push({
                inlineData: {
                    mimeType: fileData.mimeType,
                    data: fileData.base64
                }
            });
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar respuesta.";
    } catch (error) {
        console.error("Error llamando a Gemini:", error);
        throw error;
    }
}

// --- BASE DE DATOS POR DEFECTO (ING. MECÁNICA) ---
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

const App = () => {
    // --- ESTADOS CON PERSISTENCIA (LOCAL STORAGE) ---
    const [subjectsData, setSubjectsData] = useState(() => {
        const saved = localStorage.getItem('ingsys_subjects_data');
        return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS_DATA;
    });

    const [completed, setCompleted] = useState(() => {
        const saved = localStorage.getItem('ingsys_completed');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [careerName, setCareerName] = useState(() => {
        return localStorage.getItem('ingsys_career_name') || "Ingeniería Mecánica";
    });

    // --- EFFECTOS DE GUARDADO AUTOMÁTICO ---
    useEffect(() => {
        localStorage.setItem('ingsys_subjects_data', JSON.stringify(subjectsData));
    }, [subjectsData]);

    useEffect(() => {
        localStorage.setItem('ingsys_completed', JSON.stringify([...completed]));
    }, [completed]);

    useEffect(() => {
        localStorage.setItem('ingsys_career_name', careerName);
    }, [careerName]);

    // --- ESTADOS DE UI ---
    const [subjectsPerSemester, setSubjectsPerSemester] = useState(6);
    const [activeTab, setActiveTab] = useState('available');
    const [suggestedSchedule, setSuggestedSchedule] = useState(null);

    // Estados para IA y UI
    const [careerAdvice, setCareerAdvice] = useState(null);
    const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
    const [showCareerModal, setShowCareerModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [parsingError, setParsingError] = useState(null);

    // --- IMPORTADOR DE PDF (NUEVO) ---
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsParsingPdf(true);
        setParsingError(null);

        try {
            // 1. Convertir archivo a Base64
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]); // Quitar prefijo data:application/pdf...
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 2. Prompt para Gemini
            const prompt = `
        Analiza este documento PDF que contiene un Pensum o Plan de Estudios universitario.
        Tu tarea es extraer TODAS las asignaturas y devolverlas estrictamente en formato JSON válido.
        
        El formato del JSON debe ser un array de objetos:
        [
          { 
            "id": "CLAVE-101", 
            "name": "Nombre Asignatura", 
            "credits": 4, 
            "prereqs": ["CLAVE-PREVIA1", "CLAVE-PREVIA2"] 
          }
        ]

        Reglas Críticas:
        1. "id": Debe ser la clave o código oficial (ej: MAT-0140). Si no hay clave, inventa una corta única.
        2. "credits": Número entero.
        3. "prereqs": Array de strings con los IDs de los prerrequisitos. Si dice "Bachiller" o nada, pon []. Si dice una materia, busca su ID.
        4. Asegúrate de extraer TODAS las materias de todas las páginas.
        5. NO incluyas texto markdown (\`\`\`json), solo el array crudo.
        6. Si el documento tiene el nombre de la carrera, extráelo también, pero el output principal debe ser el array. Pon el nombre de la carrera en el primer objeto con una propiedad especial "careerName" si es posible, o simplemente enfócate en las materias.
      `;

            // 3. Llamar a Gemini con el PDF
            const resultText = await callGemini(prompt, { mimeType: file.type, base64: base64Data });

            // 4. Limpiar y Parsear JSON
            const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanJson);

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
                throw new Error("La IA no pudo encontrar materias en el formato correcto.");
            }

            // 5. Actualizar Estado y Guardar
            setSubjectsData(parsedData);
            setCompleted(new Set()); // Resetear progreso al cambiar de carrera
            setCareerName("Carrera Importada (Personalizada)");
            setShowSettings(false);
            alert(`¡Éxito! Se importaron ${parsedData.length} asignaturas.`);

        } catch (error) {
            console.error(error);
            setParsingError("Error al procesar el PDF. Asegúrate de que sea legible o intenta de nuevo.");
        } finally {
            setIsParsingPdf(false);
        }
    };

    const handleResetDefault = () => {
        if (confirm("¿Seguro que quieres borrar el pensum importado y volver a Ingeniería Mecánica?")) {
            setSubjectsData(DEFAULT_SUBJECTS_DATA);
            setCompleted(new Set());
            setCareerName("Ingeniería Mecánica");
            localStorage.removeItem('ingsys_subjects_data');
            setShowSettings(false);
        }
    };

    const handleClearProgress = () => {
        if (confirm("¿Borrar todo tu progreso (materias completadas)?")) {
            setCompleted(new Set());
            setShowSettings(false);
        }
    };

    // --- CÁLCULO DE PESO (Ruta Crítica) ---
    const getDependencyWeight = useMemo(() => {
        const memo = {};
        const calculateWeight = (id) => {
            if (memo[id] !== undefined) return memo[id];
            const directDependents = subjectsData.filter(s => s.prereqs.includes(id));
            let weight = directDependents.length;
            directDependents.forEach(dep => {
                weight += calculateWeight(dep.id);
            });
            memo[id] = weight;
            return weight;
        };
        const weights = {};
        subjectsData.forEach(s => weights[s.id] = calculateWeight(s.id));
        return weights;
    }, [subjectsData]);

    const toggleSubject = (id) => {
        const newCompleted = new Set(completed);
        if (newCompleted.has(id)) newCompleted.delete(id);
        else newCompleted.add(id);
        setCompleted(newCompleted);
        setSuggestedSchedule(null);
    };

    const subjectsStatus = useMemo(() => {
        return subjectsData.map(subject => {
            const isCompleted = completed.has(subject.id);
            const missingPrereqs = subject.prereqs.filter(p => !completed.has(p));
            const isLocked = !isCompleted && missingPrereqs.length > 0;
            const isAvailable = !isCompleted && !isLocked;
            const weight = getDependencyWeight[subject.id] || 0;
            const isHighPriority = isAvailable && (weight > 4 || subject.credits >= 5);
            return { ...subject, isCompleted, isLocked, isAvailable, missingPrereqs, weight, isHighPriority };
        });
    }, [completed, getDependencyWeight, subjectsData]);

    const generateSchedule = () => {
        const available = subjectsStatus.filter(s => s.isAvailable);
        const sorted = [...available].sort((a, b) => b.weight - a.weight || b.credits - a.credits);
        const suggested = sorted.slice(0, subjectsPerSemester);
        setSuggestedSchedule(suggested);
        setActiveTab('available');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const totalCredits = subjectsData.reduce((acc, s) => acc + s.credits, 0);
    const earnedCredits = subjectsStatus.filter(s => s.isCompleted).reduce((acc, s) => acc + s.credits, 0);
    const remainingSubjectsCount = subjectsStatus.filter(s => !s.isCompleted).length;
    const estimatedSemesters = remainingSubjectsCount > 0 ? Math.ceil(remainingSubjectsCount / subjectsPerSemester) : 0;
    const progressPercentage = totalCredits > 0 ? Math.round((earnedCredits / totalCredits) * 100) : 0;

    const availableList = subjectsStatus.filter(s => s.isAvailable);
    const lockedList = subjectsStatus.filter(s => s.isLocked);
    const completedList = subjectsStatus.filter(s => s.isCompleted);

    const handleCareerAdvice = async () => {
        setShowCareerModal(true);
        if (careerAdvice) return;
        setIsGeneratingAdvice(true);
        const completedNames = completedList.map(s => s.name).join(", ");
        const promptContext = completedNames.length > 0 ? `He completado: ${completedNames}.` : "Acabo de comenzar.";
        const prompt = `Soy estudiante de ${careerName}. ${promptContext}. Sugiere 3 roles profesionales y habilidades a desarrollar. Sé breve y usa emojis.`;
        const result = await callGemini(prompt);
        setCareerAdvice(result);
        setIsGeneratingAdvice(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative pb-20 md:pb-0">

            {/* --- HEADER RESPONSIVE --- */}
            <div className="bg-blue-900 text-white shadow-lg sticky top-0 z-30 transition-all">
                <div className="max-w-5xl mx-auto p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                                <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-yellow-400" />
                                Ingeniero Pro
                            </h1>
                            <p className="text-blue-200 text-xs md:text-sm truncate max-w-[200px] md:max-w-none">{careerName}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSettings(true)}
                                className="bg-blue-800 p-2 rounded-lg hover:bg-blue-700 transition-colors"
                                title="Configuración e Importación"
                            >
                                <Settings className="w-5 h-5 text-blue-200" />
                            </button>

                            <button
                                onClick={handleCareerAdvice}
                                className="hidden md:flex bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow items-center gap-2 transition-all active:scale-95"
                            >
                                <Sparkles className="w-4 h-4 text-yellow-300" /> Coach IA
                            </button>

                            <div className="bg-blue-800 rounded px-3 py-1.5 text-right border border-blue-700 shadow-inner min-w-[60px]">
                                <div className="text-lg md:text-xl font-bold leading-none">{remainingSubjectsCount}</div>
                                <div className="text-[9px] md:text-[10px] text-blue-300 uppercase tracking-wide">Faltan</div>
                            </div>

                            {/* Mobile IA Button */}
                            <button
                                onClick={handleCareerAdvice}
                                className="md:hidden bg-purple-600 text-white p-2 rounded-lg shadow-lg active:bg-purple-700"
                            >
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar Compacta */}
                    <div className="mb-4">
                        <div className="flex justify-between text-[10px] md:text-xs mb-1 text-blue-200 font-medium">
                            <span>{earnedCredits} / {totalCredits} Créditos</span>
                            <span>{progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-blue-950 rounded-full h-2 overflow-hidden shadow-inner">
                            <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>

                    {/* Controls Bar Responsive */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-blue-800/60 p-3 rounded-lg border border-blue-700/50 backdrop-blur-sm">
                        <div className="flex justify-between md:justify-start items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-300" />
                                <span className="text-sm font-bold">{estimatedSemesters} Sem. Restantes</span>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-900/50 px-2 py-1 rounded">
                                <span className="text-xs text-blue-300">Mat/Sem:</span>
                                <select
                                    value={subjectsPerSemester}
                                    onChange={(e) => setSubjectsPerSemester(Number(e.target.value))}
                                    className="bg-transparent text-white text-sm font-bold focus:outline-none appearance-none cursor-pointer"
                                >
                                    {[3,4,5,6,7,8].map(n => <option key={n} value={n} className="text-slate-900">{n}</option>)}
                                </select>
                                <ChevronDown size={12} className="text-blue-300" />
                            </div>
                        </div>
                        <div className="flex-grow"></div>
                        <button
                            onClick={generateSchedule}
                            className="w-full md:w-auto bg-green-500 hover:bg-green-400 text-blue-900 font-bold px-4 py-3 md:py-1.5 rounded-lg shadow-lg flex justify-center items-center gap-2 text-sm transition-transform active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Armar Horario
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 md:pb-12">

                {/* --- TABS SCROLLABLE --- */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 snap-x hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    <TabButton active={activeTab === 'available'} onClick={() => setActiveTab('available')} icon={Unlock} label={`Disponibles (${availableList.length})`} color="green" />
                    <TabButton active={activeTab === 'locked'} onClick={() => setActiveTab('locked')} icon={Lock} label={`Bloqueadas (${lockedList.length})`} color="slate" />
                    <TabButton active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} icon={CheckCircle} label={`Listas (${completedList.length})`} color="blue" />
                </div>

                {/* Content */}
                <div className="space-y-4 min-h-[50vh]">
                    {activeTab === 'available' && (
                        <div className="animate-fade-in">
                            {suggestedSchedule && (
                                <div className="mb-6 bg-green-50/90 backdrop-blur border border-green-200 p-4 rounded-xl relative overflow-hidden shadow-sm">
                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                        <div>
                                            <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
                                                <span className="bg-green-600 text-white p-1 rounded-full"><CheckCircle size={14}/></span>
                                                Horario Sugerido
                                            </h2>
                                            <p className="text-xs text-green-700 mt-1">Sugerencia óptima para avanzar rápido.</p>
                                        </div>
                                        <button onClick={() => setSuggestedSchedule(null)} className="p-2 -mr-2 text-green-600 hover:bg-green-100 rounded-full"><X size={16}/></button>
                                    </div>
                                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
                                        {suggestedSchedule.map(s => (
                                            <div key={s.id} className="bg-white p-3 rounded-lg border border-green-100 shadow-sm flex items-center justify-between">
                                                <span className="font-semibold text-sm text-slate-700 truncate w-3/4">{s.name}</span>
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono">{s.credits}cr</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* High Priority Section */}
                            {availableList.some(s => s.isHighPriority) && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Flame className="w-4 h-4" /> Prioridad Crítica
                                    </h3>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        {availableList.filter(s => s.isHighPriority).map(subject => (
                                            <SubjectCard key={subject.id} subject={subject} onToggle={() => toggleSubject(subject.id)} careerName={careerName} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Normal Priority */}
                            {availableList.some(s => !s.isHighPriority) && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Flexible
                                    </h3>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                        {availableList.filter(s => !s.isHighPriority).map(subject => (
                                            <SubjectCard key={subject.id} subject={subject} onToggle={() => toggleSubject(subject.id)} careerName={careerName} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'locked' && (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {lockedList.map(subject => (
                                <SubjectCard key={subject.id} subject={subject} onToggle={() => toggleSubject(subject.id)} careerName={careerName} />
                            ))}
                        </div>
                    )}

                    {activeTab === 'completed' && (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {completedList.map(subject => (
                                <SubjectCard key={subject.id} subject={subject} onToggle={() => toggleSubject(subject.id)} careerName={careerName} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL DE CONFIGURACIÓN / IMPORTAR --- */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-slate-500" /> Configuración
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Sección Importar PDF */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" /> Importar Nuevo Pensum (PDF)
                                </h4>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center relative group">
                                    {isParsingPdf ? (
                                        <div className="flex flex-col items-center gap-3 py-4">
                                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                            <p className="text-xs text-blue-600 font-semibold animate-pulse">Analizando PDF con IA...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-blue-300 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                                            <p className="text-xs text-slate-500 mb-2">Sube el PDF de tu carrera. La IA detectará las materias.</p>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold pointer-events-none">
                                                Seleccionar Archivo
                                            </button>
                                        </>
                                    )}
                                </div>
                                {parsingError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">{parsingError}</p>}
                            </div>

                            <div className="h-px bg-slate-100 my-2"></div>

                            {/* Sección Acciones Peligrosas */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleResetDefault}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
                                >
                                    <span>Restaurar Ing. Mecánica</span>
                                    <RefreshCw className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={handleClearProgress}
                                    className="w-full flex items-center justify-between p-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                                >
                                    <span>Borrar Progreso Actual</span>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 text-center text-[10px] text-slate-400">
                            Tus datos se guardan automáticamente en este dispositivo.
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CAREER --- */}
            {showCareerModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center md:p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-lg md:max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                                <BrainCircuit className="text-purple-600 w-6 h-6" /> Orientación IA
                            </h3>
                            <button onClick={() => setShowCareerModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24} className="text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                            <div className="prose prose-sm prose-slate max-w-none">
                                {isGeneratingAdvice ? (
                                    <div className="py-12 text-center flex flex-col items-center gap-3">
                                        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                                        <p className="text-slate-500 font-medium">Analizando perfil...</p>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{careerAdvice || "Error al cargar."}</div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end">
                            <button onClick={() => setShowCareerModal(false)} className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Entendido</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTES UI AUXILIARES ---

const TabButton = ({ active, onClick, icon: Icon, label, color }) => (
    <button
        onClick={onClick}
        className={`snap-center flex-none py-3 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap border shadow-sm
      ${active
            ? `bg-${color}-600 text-white border-${color}-600 shadow-${color}-200 scale-105`
            : `bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300`}`}
    >
        <Icon className="h-4 w-4" /> {label}
    </button>
);

const SubjectCard = ({ subject, onToggle, careerName }) => {
    const [expanded, setExpanded] = useState(false);
    const [aiTip, setAiTip] = useState(null);
    const [loadingTip, setLoadingTip] = useState(false);
    const [showAi, setShowAi] = useState(false);

    const handleAiTip = async (e) => {
        e.stopPropagation();
        setShowAi(true); setExpanded(true);
        if (aiTip) return;
        setLoadingTip(true);
        const tip = await callGemini(`Dame 3 tips ultra-breves para aprobar "${subject.name}" de la carrera ${careerName}. Usa emojis.`);
        setAiTip(tip);
        setLoadingTip(false);
    };

    return (
        <div className={`rounded-xl shadow-sm border transition-all duration-200 overflow-hidden relative group active:scale-[0.99] touch-manipulation
      ${subject.isCompleted ? 'bg-blue-50 border-blue-200' :
            subject.isHighPriority ? 'bg-white border-orange-300 ring-1 ring-orange-100 shadow-orange-100' :
                subject.isLocked ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>

            {subject.isHighPriority && !subject.isCompleted && (
                <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-bl-lg font-bold flex items-center gap-1 z-10">
                    <Flame size={10} /> CRÍTICA
                </div>
            )}

            <div className="p-4 flex items-center gap-3" onClick={() => setExpanded(!expanded)}>
                <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className={`flex-shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 transition-colors z-20
          ${subject.isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
                            'bg-white border-slate-300 hover:border-blue-400 active:bg-blue-50'}`}>
                    {subject.isCompleted && <CheckCircle size={20} className="md:w-4 md:h-4" />}
                </button>

                <div className="flex-grow min-w-0">
                    <div className="font-bold text-sm md:text-base truncate text-slate-800 leading-tight">{subject.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{subject.id}</span>
                        <span>{subject.credits} CR</span>
                        {subject.isLocked && <span className="text-red-500 flex items-center gap-0.5 font-medium"><Lock size={10}/></span>}
                    </div>
                </div>

                <button
                    onClick={handleAiTip}
                    className="p-3 md:p-2 -mr-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors z-20"
                >
                    <Lightbulb size={20} className="md:w-5 md:h-5" />
                </button>
            </div>

            {expanded && (
                <div className="px-4 py-3 bg-slate-50/80 text-sm border-t border-slate-100 animate-in slide-in-from-top-2">
                    {showAi && (
                        <div className="mb-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                            <div className="font-bold text-indigo-700 mb-2 flex justify-between text-xs uppercase tracking-wide">
                                <span>Tips IA</span>
                                {loadingTip && <Loader2 className="w-3 h-3 animate-spin" />}
                            </div>
                            <div className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">
                                {loadingTip ? <div className="h-8 bg-slate-100 rounded animate-pulse"></div> : aiTip}
                            </div>
                        </div>
                    )}
                    {subject.prereqs.length > 0 ? (
                        <div>
                            <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider">Prerrequisitos:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {subject.prereqs.map(p => (
                                    <span key={p} className="px-2 py-1 rounded text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
                     {p}
                   </span>
                                ))}
                            </div>
                        </div>
                    ) : <span className="text-slate-400 italic text-xs">Sin prerrequisitos</span>}
                </div>
            )}
        </div>
    );
};

export default App;