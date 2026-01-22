import axios from 'axios';

const api = axios.create({
  baseURL: 'https://colopeace.onrender.com/api', // adapter par IP si mobile
  headers: { 'Content-Type': 'application/json' },
});

export default api;
