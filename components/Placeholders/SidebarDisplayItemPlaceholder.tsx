import React from 'react';

const SidebarDisplayItemPlaceholder: React.FC = () => {
  return (
    <div style={{ padding: '10px 20px', margin: '5px 20px', backgroundColor: '#e0e0e0', borderRadius: '4px', height: '40px', display: 'flex', alignItems: 'center' }} aria-label="sidebar display item placeholder">
      <div style={{ width: '70%', height: '20px', backgroundColor: '#c0c0c0', borderRadius: '4px' }}></div>
    </div>
  );
};

export default SidebarDisplayItemPlaceholder;
