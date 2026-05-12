import express from "express";
// import './jobs/ExpireyClear';
import productRoute from './routes/product.route'
import { configDotenv } from "dotenv";
const app = express()
configDotenv();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', productRoute);

app.listen(PORT, ()=>{
    console.log(`app is listing on port ${PORT}`);
})




