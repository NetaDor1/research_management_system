import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Page.css';

const ResearchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigate('/research')}
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
          ← חזרה למחקרים
        </button>
        <h1>פרטי מחקר #{id}</h1>
        <p>פרטים מפורטים של המחקר יוצגו כאן</p>
      </div>
    </div>
  );
};

export default ResearchDetail;

