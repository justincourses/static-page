import { useState } from 'react';

export default function Profile({ idx }) {
  const [name] = useState('John Doe');
  const [image] = useState('https://images.unsplash.com/photo-1742201876815-b7b726c90e27?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');

  return (
    <li className="gallery-avatar">
      <img src={image} />
      <h3>{idx + 1}: {name}</h3>
    </li>
  );
}
