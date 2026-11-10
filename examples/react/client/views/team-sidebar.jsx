export const TeamSidebar = ({ data }) => (
  <div className='side-card'>
    <h4>
      Members <span className='count'>{data.members.length}</span>
    </h4>
    <ul className='list'>
      {data.members.map((member) => (
        <li key={member.id}>
          <a href={`/team/${member.org}/m/${member.id}`} className='item'>
            <span className='dot' data-access={member.access}></span>
            {member.name}
          </a>
        </li>
      ))}
    </ul>
    <div className='filler'>
      {Array.from({ length: 30 }, (_, index) => <p key={index} className='muted'>Scroll line {index + 1}</p>)}
    </div>
  </div>
);
