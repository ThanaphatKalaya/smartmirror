var Sequelize = require('sequelize');
var bcrypt = require('bcrypt-nodejs');

// create a sequelize instance with our local database information.
var sequelize = new Sequelize('mirrors', 'root', '1234', {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql'
});

// setup User model and its fields.
var Mirror = sequelize.define('mirrors', {
    mirror_id: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    news_category: {
        type: Sequelize.STRING,
        allowNull: false
    },
    from_lat: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    from_lng: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    to_lat: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    to_lng: {
        type: Sequelize.FLOAT,
        allowNull: false
    }
}, {
    hooks: {
        beforeCreate: (user) => {
            const salt = bcrypt.genSaltSync();
            user.password = bcrypt.hashSync(user.password, salt);
        }
    }
});

Mirror.prototype.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
}

// create all the defined tables in the specified database.
sequelize.sync()
    .then(() => console.log('users table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = Mirror;
