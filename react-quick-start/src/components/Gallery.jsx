import { useMemo } from 'react';

import Profile from './Profile';
import Controller from './Controller';

import { USERS } from '../constants/Users';

export default function Gallery({ count, setCount }) {
  const userList = useMemo(() => USERS.slice(0, count), [count]);

  return (
    <section>
      <h1>Amazing scientists {count}</h1>
      <ul className="gallery">
        {userList.map((user, index) => (
          <Profile key={index} idx={index} user={user} />
        ))}
      </ul>
      <Controller count={count} setCount={setCount} maxLength={USERS.length} />
    </section>
  );
}
