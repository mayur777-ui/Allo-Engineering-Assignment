import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL;


export const apiClient = axios.create({
  baseURL: baseURL,
  headers: {"Content-Type": "application/json",},
});

