import React from 'react';

const DisplayPlaceholder: React.FC = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}>
      <p>Loading Display...</p>
      {/* You can add a spinner or skeleton UI here later */}
    </div>
  );
};

export default DisplayPlaceholder;
