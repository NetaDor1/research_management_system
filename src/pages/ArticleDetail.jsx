import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Page.css';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-content">
        <button 
          onClick={() => navigate('/articles')}
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
          ← חזרה למאמרים
        </button>
        <h1>פרטי מאמר #{id}</h1>
        <p>פרטים מפורטים של המאמר יוצגו כאן</p>
      </div>
    </div>
  );
};

export default ArticleDetail;

