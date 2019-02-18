import Session from '../Session';

export default interface Migration {
  create(session: Session): Promise<void>;
  update(session: Session): Promise<void>;
  drop(session: Session): Promise<void>;
}