// Configuração do sistema.
// Enquanto supabaseUrl estiver vazio, o sistema roda em MODO DEMONSTRAÇÃO
// (dados só no navegador, usuários de teste). Preenchendo os dois campos do
// Supabase, ele passa a usar o banco de verdade.
window.CONFIG = {
  supabaseUrl: "https://miqmwjxdmulgtwqhtdqp.supabase.co",          // ex.: https://abcdefgh.supabase.co  (Project Settings → API)
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pcW13anhkbXVsZ3R3cWh0ZHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2MTE2MzcsImV4cCI6MjExMDE4NzYzN30.ejKrB3WAO8vmIM2YsSDXXh01_qxeocSRS8I9qxNjZcY",      // chave "anon public" (pode ficar no site; a segurança é feita pelo banco)
  dominioLogin: "pedidos.cellstore.local", // igual ao DOMINIO_LOGIN da função admin-usuarios
  whatsappFabrica: "555195798781",      // ex.: 5511999998888 (com DDI e DDD, só números). Vazio = botão "em breve"
  pastaCatalogoDrive: "https://drive.google.com/drive/folders/1jTOntOZmiWMoWhOVBPBatVUyzcYrdwsz"
};
