import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Criar a conta (usando o RegisterSerializer do Django)
      await api.post("register/", {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
      });

      // 2. Se a conta foi criada, podemos opcionalmente atualizar o perfil
      // ou apenas mandar para o login
      navigate("/login");
    } catch {
      setError("Erro ao registar. Verifica os dados ou se o user já existe.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Criar Conta</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 mb-4 border rounded"
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
        />
        <input
          type="text"
          placeholder="Nome Completo"
          className="w-full p-2 mb-4 border rounded"
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-4 border rounded"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-6 border rounded"
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />
        <button
          type="submit"
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          Registar
        </button>
        <p className="mt-4 text-center text-sm">
          Já tem conta?{" "}
          <Link to="/login" className="text-blue-500">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
