//File imports 
require('dotenv').config()
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const md5 = require('md5');


// configurations
const app = express();
const port = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// middlewares
app.use(cors());
app.use(express.json());


// api routes

app.post('/registerUser', (req, res) => {
    const username = req.body.username;
    const password = md5(req.body.password);
    pool.query(`INSERT INTO users (username, password) VALUES ('${username}', '${password}')`, (err, res) => {
        if (err) { console.log(err.stack); }
    });
    res.send("registered user");
});

app.post('/setUserPreferences', (req, res) => {
    const username = req.body.username;
    const preferences = JSON.stringify(req.body.preferences);
    pool.query(`UPDATE users SET preferences = '${preferences}' WHERE username = '${username}'`, (err, res) => {
        if (err) { console.log(err.stack); }
    });
    res.send("preference set");
});

app.get('/userWeatherData', async (req, res) => {
    const querycity = req.query.city;
    const { rows } = await pool.query(`select city,weather from city_weather WHERE city='${querycity}'`);
    if(rows){
        res.send(rows);
    }
    else{
        res.send("Error Occured");
    }
    
});

app.get('/updateWeatherData', async (req, res) => {
    const { rows } = await pool.query('SELECT city from city_weather');
    const promises = [];
    for (let data of rows) {
        let city = data.city;
        promises.push(
            axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}`)
                .then((res) => {
                    let weather = {};
                    weather.temp = res.data.main.temp;
                    weather.description = res.data.weather[0].description;
                    weather.temp_min = res.data.main.temp_min;
                    weather.temp_max = res.data.main.temp_max;
                    weather.wind = res.data.wind;
                    weather.clouds = res.data.clouds;
                    weather = JSON.stringify(weather);
                    pool.query(`UPDATE city_weather SET weather = '${weather}' WHERE city = '${city}'`);
                })
        );
    }
    axios.all(promises).then(() => res.send("updated weather")).catch((err) => console.log(err));
});


// listen
app.listen(port, () => console.log(`App started on localhost:${port}`));
