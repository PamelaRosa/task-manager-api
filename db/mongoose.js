//  Este arquivo irá lidar com a lógica de conexão para MongoDB database

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/TaskManager', { useNewUrlParser: true }).then(() =>  {
    console.log("Conectado ao MongoDB com sucesso :) ");
}).catch((e) => {
    console.log(" Erro ao tentar se conectar ao MongoDB");
    console.log(e);
});

// Para evitar avisos de depreciação (do driver nativo MongoDB)
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

module.exports = {
    mongoose
};