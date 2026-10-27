import { fileURLToPath } from 'node:url';
import { criarApp } from './app.ts';
import { Banco } from './banco.ts';

const PORTA = Number(process.env['PORTA'] ?? 3000);
const ARQUIVO = fileURLToPath(new URL('./db.json', import.meta.url));

// Só escuta no próprio PC (127.0.0.1): o navegador fala com o `ng serve` em
// localhost:4200, que repassa /api para cá (ver proxy.conf.json).
criarApp(new Banco(ARQUIVO)).listen(PORTA, '127.0.0.1', () => {
  console.log(`API em http://localhost:${PORTA}/api · dados em ${ARQUIVO}`);
});
