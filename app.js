const express = require('express');
const app = express();

/* ROUTE HANDLERS */

/* LIST ROUTES */

/**
 * GET /lists
 * Proposito: pegar todas as listas
 */
app.get('/lists', (req, res) => {
    // Retornar um array de todas as listas no database

});

app.post('/lists', (req, res) => {
    // Criar uma nova lista e retornar o documento da nova lista de volta para o usuário ( com o ID incluso)
    // As informações da lista (campos) serão passados através do corpo de requisição do JSON 

});

app.patch('/lists/:id', (req, res) => {
    // Atualizar a lista especifica (a lista com seu ID na URL) com os novos valores no corpo de requisição do JSON
});

app.delete('/lists/:id', (req, res) => {
    // Deletar a lista especifica ( com o ID na URL)
});

app.listen(3000, () => {
    console.log("Servidor está escutando a porta 3000");
})