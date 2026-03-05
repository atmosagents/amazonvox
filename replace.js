const fs = require('fs');
const file = 'c:\\VOXGEO\\app\\dashboard\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStart = "    useEffect(() => {\\r\\n        const survey = surveys.find(s => s.id === selectedSurveyId)";
const targetEnd = "    }, [selectedSurveyId, surveys, rawData])";

const idxStart = content.indexOf("    useEffect(() => {\r\n        const survey = surveys.find(s => s.id === selectedSurveyId)");
if (idxStart === -1) {
    console.log("Could not find start block using CRLF, trying LF");
}

const replacement = `    useEffect(() => {
        if (!rawData || rawData.length === 0) {
            setDynamicQuestions([])
            return
        }

        // Lista de palavras que identificam campos abertos/pessoais que não servem para filtro
        const invalidWords = ['nome', 'telefone', 'whatsapp', 'cpf', 'rg', 'email', 'qual seu nome']

        // 1. Extração Direta (Auto-Discovery): Coletar todas as chaves de todos os eleitores
        const allKeys = new Set()
        rawData.forEach(v => {
            const ans = v.raw_data || v.respondent_data || {}
            Object.keys(ans).forEach(key => allKeys.add(key))
        })

        // 2. Filtragem de Chaves
        const validKeys = Array.from(allKeys).filter(key => {
            const kLower = key.toLowerCase()
            return !invalidWords.some(word => kLower.includes(word))
        })

        // 3. Renderização Dinâmica e Opções Reais
        const questionsWithOptions = validKeys.map(key => {
            const uniqueValues = new Set()
            rawData.forEach(v => {
                const ans = v.raw_data || v.respondent_data || {}
                const val = ans[key]
                if (val && typeof val === 'string' && val.trim() !== '') {
                    uniqueValues.add(val.trim())
                }
            })

            return {
                filterKey: key,
                label: key,
                options: Array.from(uniqueValues).map(val => ({ label: val, value: val }))
            }
        }).filter(q => q.options.length > 0) // Só exibe o filtro se houver opções disponíveis

        setDynamicQuestions(questionsWithOptions)
    }, [rawData])`;

// regex replacement
const regex = /    useEffect\(\(\) => \{\s+const survey = surveys\.find\(s => s\.id === selectedSurveyId\)(.|\s)*?\}, \[selectedSurveyId, surveys, rawData\]\)/;
if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Success");
} else {
    console.log("Regex not found");
}
