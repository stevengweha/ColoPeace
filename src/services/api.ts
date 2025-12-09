import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.1.115:5001/api', // Remplace par ton IP si mobile
  headers: { 'Content-Type': 'application/json' },
});

export default api;
