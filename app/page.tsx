'use client';

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import DropdownButton from '../components/DropdownButton';
import { getDisplays } from '../actions/display';

// Simplified display data for the dropdown
interface IDisplaySummary {
  _id: string;
  name: string;
}

async function getDisplaysData(): Promise<IDisplaySummary[]> {
  try {
    const host = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://your-domain.com'; // Update this with your production domain
    
    const fullDisplayList = await getDisplays(host);
    
    // Ensure fullDisplayList is an array before calling map
    if (!Array.isArray(fullDisplayList)) {
      console.error("getDisplays() did not return an array:", fullDisplayList);
      return [];
    }
    
    return fullDisplayList.map(display => ({
      _id: display._id,
      name: display.name,
    }));
  } catch (error) {
    console.error("Failed to fetch displays:", error);
    return [];
  }
}

export default async function HomePage() {
  const displays = await getDisplaysData();

  // Ensure displays is an array before calling map
  const dropdownChoices = Array.isArray(displays) ? displays.map(display => ({
    key: display._id,
    name: display.name,
  })) : [];

  const navigateToDisplay = (id: string) => {
    redirect('/display/' + id);
  };

  return (
    <div className='home'>
      <p>The Digital Signage server is running in the background.</p>
      <div className='btn-group'>
        <Link href='/layout' style={{ margin: 20 }}>
          <div className='btn admin'>Admin Home</div>
        </Link>
        <div style={{ margin: 20 }}>
          <DropdownButton
            icon='chevron-down'
            text='Display Home'
            style={styles.btn}
            onSelect={navigateToDisplay}
            choices={dropdownChoices}
          />
        </div>
      </div>
      <style jsx>
        {`
          .home {
            font-family: 'Open Sans', sans-serif;
            padding: 40px;
            max-width: 960px;
            margin: auto;
            text-align: center;
          }
          .home p {
            margin-bottom: 20px;
          }
          .btn-group {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
          }
          .btn {
            background: lightgray;
            padding: 20px;
            text-decoration: none;
            text-transform: uppercase;
            color: white;
            border-radius: 4px;
            margin: 20px;
            font-size: 16px;
          }
          .btn.admin {
            background: #03a9f4;
          }
        `}
      </style>
    </div>
  );
}

const styles = {
  btn: {
    padding: 20,
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
    borderRadius: 4,
    fontSize: 16,
  },
};