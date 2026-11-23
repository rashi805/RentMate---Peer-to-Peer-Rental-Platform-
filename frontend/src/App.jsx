import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Auth from './pages/Auth';
import ItemDetail from './pages/ItemDetail';
import ListingForm from './pages/ListingForm';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import './styles.css';

export default function App() {
  return <BrowserRouter><AuthProvider><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="explore" element={<Explore/>}/><Route path="items/:id" element={<ItemDetail/>}/><Route path="login" element={<Auth/>}/><Route path="register" element={<Auth mode="register"/>}/><Route path="list-item" element={<ProtectedRoute><ListingForm/></ProtectedRoute>}/><Route path="dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/><Route path="history" element={<ProtectedRoute><History/></ProtectedRoute>}/><Route path="profile" element={<ProtectedRoute><Profile/></ProtectedRoute>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></AuthProvider></BrowserRouter>;
}
