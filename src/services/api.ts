import axios from 'axios';

const api = axios.create({
  baseURL: 'https://colopeace.onrender.com/api', // adapter par IP si mobile
  });

export default api;
