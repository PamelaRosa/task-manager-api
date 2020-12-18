const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// JWT Secret
const jwtSecret = "91283120339123kadjadncmewwdssss109812318912310";

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Number,
            required: true
        }
    }]
});

// *** Métodos de Instância ***  

UserSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    // Retornar o documento exceto a senha e as sessões (não deverão estar disponiveis)
    return _.omit(userObject, ['password', 'sessions']);
}

UserSchema.methods.generateAccessAuthToken = function () {
    const user = this;
    return new Promise((resolve, reject) => {
        // Criar o JSON web Token  e retorná-lo
        jwt.sign({ _id: user._id.toHexString() }, jwtSecret, { expiresIn: "15m" }, (err, token) => {
            if (!err) {
                resolve(token);
            } else {
                // Há um erro
                reject();
            }
        })
    })
}

UserSchema.methods.generateRefreshAuthToken = function () {
    // Esse método simplesmente gera um hex string de 64byte - isso não é salvo para a database.
    // O que faz isso é o saveSessionToDatabase()
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            if (!err) {
                // Sem erro
                let token = buf.toString('hex');

                return resolve(token);
            } else {
                reject();
            }
        })
    })
}

UserSchema.methods.createSession = function () {
    let user = this;

    return user.generateRefreshAuthToken().then((refreshToken) => {
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken) => {
        // Salvo para database com sucesso
        // Agora retorne o refresh token
        return refreshToken;
    }).catch((e) => {
        return Promise.reject('Falha ao salvar a sessão na database.\n' + e);
    })
}


/* MÉTODOS MODELOS (métodos estáticos) */
UserSchema.statics.getJWTSecret = () => {
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function (_id, token) {
    // Encontra o usuário pelo ID e token 
    // Usado no middleware de autenticação (verifySession)

    const User = this;

    return User.findOne({
        _id,
        'sessions.token': token
    });
}

UserSchema.statics.findByCredentials = function (email, password) {
    let User = this;
    return User.findOne({ email }).then((user) => {
        if (!user) return Promise.reject();

        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                }
                else {
                    reject();
                }
            })
        })
    })
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondSinceEpoch) {
        // Não expirou
        return false;
    } else {
        // Expirou
        return true;
    }
}

/* MIDDLEWARE */
// Antes de salvar o documento do usuário, esse codigo será rodado
UserSchema.pre('save', function (next) {
    let user = this;
    let costFactor = 10;

    if (user.isModified('password')) {
        // Se o campo de senha foi mudado/editado então esse código será rodado

        // Gerar uma senha forte e hash
        bcrypt.genSalt(costFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            })
        });
    } else {
        next();
    }
});


/* MÉTODOS AUXILIARES */
let saveSessionToDatabase = (user, refreshToken) => {
    return new Promise((resolve, reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();

        user.sessions.push({ 'token': refreshToken, expiresAt });

        user.save().then(() => {
            // Sessão salva com sucesso
            return resolve(refreshToken);
        }).catch((e) => {
            reject(e);
        });
    })
}

let generateRefreshTokenExpiryTime = () => {
    let daysUntilExpire = "10";
    let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
    return ((Date.now() / 1000) + secondsUntilExpire);
}

const User = mongoose.model('User', UserSchema);

module.exports = { User }