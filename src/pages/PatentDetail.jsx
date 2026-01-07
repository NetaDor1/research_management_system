import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Page.css';

const PatentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigate('/patents')}
          style={{
            marginBottom: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← חזרה לפטנטים
        </button>
        <h1>פרטי פטנט #{id}</h1>
        <p>פרטים מפורטים של הפטנט יוצגו כאן</p>
      </div>
    </div>
  );
};

export default PatentDetail;

