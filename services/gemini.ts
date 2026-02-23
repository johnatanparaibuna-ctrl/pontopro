import { GoogleGenAI } from "@google/genai";
import { Employee, Punch, AbsenceRecord } from '../types';

export const GeminiService = {
  generateDailySummary: async (employees: Employee[], punches: Punch[]) => {
    // Instanciar apenas no momento do uso para evitar crashes no carregamento da página
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toISOString().split('T')[0];
    const todayPunches = punches.filter(p => p.timestamp.startsWith(today));
    
    const statusSummary = employees.map(emp => {
      const empPunches = todayPunches.filter(p => p.employeeId === emp.id);
      const hasIn = empPunches.some(p => p.type === 'IN');
      const hasOut = empPunches.some(p => p.type === 'OUT');
      return `${emp.name} (${emp.role}): Status ${emp.status}, Ponto: ${hasIn ? 'Entrada OK' : 'Sem Entrada'}, ${hasOut ? 'Saída OK' : 'Sem Saída'}`;
    }).join('\n');

    const prompt = `És um assistente de RH em Portugal. Analisa os dados de presença de hoje e cria um resumo profissional e motivacional em Português de Portugal (pt-PT). Destaque ausências e quem está de férias.
    Dados de hoje (${today}):
    ${statusSummary}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.7 }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini summary error:", error);
      return "Não foi possível gerar o resumo inteligente no momento.";
    }
  },

  draftDailyEmail: async (employees: Employee[], punches: Punch[], records: AbsenceRecord[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('pt-PT');
    const prompt = `Escreve o corpo de um email formal para a administração com o assunto "Relatório Diário de Assiduidade - ${today}". 
    Utiliza Português de Portugal (vós não, apenas formalismo sr./sra.). 
    Inclui uma secção para Ocorrências (Faltas/Férias) e outra para Pontos Registados.
    Dados: ${employees.length} colaboradores totais, ${records.length} ocorrências ativas.
    Sê conciso e profissional.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      return "Erro ao gerar rascunho de email.";
    }
  }
};