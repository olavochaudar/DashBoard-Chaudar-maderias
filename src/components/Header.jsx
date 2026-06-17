import React, { useRef, useState } from 'react';
import './Header.css';

const Header = () => {
  const fileInputRef = useRef(null);
  const [profilePic, setProfilePic] = useState("foto-perfil.jpg"); // Estado da imagem

  // Função para abrir o seletor de arquivos ao clicar na foto
  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  // Função para processar a imagem selecionada
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result); // Atualiza a imagem com a foto escolhida
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header>
      <div className='header-container'>
        <div className='spacer'></div>

        <div className='header-container-two'>
          <img className='logo' src="Logo.png" alt="Logo" />
        </div>

        <div className='profile-container'>
          <span className='user-name'>Lincon Chaudar</span>

          {/* Input invisível para o upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*"
          />

          {/* Imagem que funciona como gatilho */}
          <img
            className='profile-pic'
            src={profilePic}
            alt="Foto de Perfil"
            onClick={handleImageClick}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;