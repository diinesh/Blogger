let mongoose = require('mongoose')
let crypto = require('crypto')
const SALT = 'BLOGGER'
let nodeify = require('bluebird-nodeify')

require('songbird')

let UserSchema = mongoose.Schema({
	username: {
		type:String,
		required: true,
        unique: true
	},
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    blogTitle: {
    	type:String,
    	required: true
    } ,
    blogDescription: {
    	type:String,
    	required: false
    }
})

UserSchema.statics.generateHash = generateHash
async function generateHash(password) {
  let hash = await crypto.promise.pbkdf2(password, SALT, 4096, 512, 'sha256')
  return hash.toString('hex')
}

UserSchema.methods.validatePassword = async function (password) {
  let hash = await crypto.promise.pbkdf2(password, SALT, 4096, 512, 'sha256')
  return hash.toString('hex') === this.password
}

UserSchema.pre('save', function(callback) {
    nodeify(async() => 
    {
        if(this.isModified('password')) {
            this.password = await generateHash(this.password)
        }        
    }(), callback)
})


module.exports = mongoose.model('User', UserSchema)
