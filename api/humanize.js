export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, personality, audit } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const systemPrompt = `Eres un editor experto que elimina patrones de escritura generada por IA y reescribe el texto para que suene natural y humano.

Patrones a eliminar:
- Inflación de importancia: "momento pivotal", "testamento de", "subraya la importancia", "paisaje en evolución", "transformador", "innovador", "sin precedentes"
- Regla de tres forzada: listas de "X, Y y Z" por todas partes
- Vocabulario IA: "profundizar", "tapiz", "crucial", "vital", "robusto", "aprovechar", "utilizar", "delve", "tapestry", "groundbreaking"
- Relleno gerundivo: "mostrando cómo", "destacando la", "subrayando su"
- Frases de relleno: "En conclusión", "Es importante señalar", "Vale la pena notar", "Cabe destacar"
- Exceso de rayas em (—)
- Cierres genéricos optimistas
- Evitar cópula: convertir "X es Y" en "X sirve como Y", "X funciona como Y"
- Cobertura mediática sin contexto
- Hedging falso: "podría potencialmente argumentarse"

${personality ? 'Añade voz genuina: varía la longitud de oraciones, incluye reacciones y opiniones, deja entrar algo de desorden. Oraciones cortas mezcladas con largas. Reacciona a los hechos en lugar de solo reportarlos.' : 'Mantén un tono neutro y limpio.'}

Mantén el idioma del texto original.

${audit ? `Responde ÚNICAMENTE con JSON válido, sin markdown, sin backticks:
{"audit":"Diagnóstico de 2-3 oraciones sobre qué hacía al texto sonar a IA. Sé específico.","rewrite":"El texto humanizado final"}` : 'Responde únicamente con el texto humanizado, sin explicación ni JSON.'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const result = data.content.map(i => i.text || '').join('');
    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
