import {AssociationOptions, AssociationType, ColumnOptions, DataType} from './Schema';
import OrqlExecutor from './OrqlExecutor';

export function intPkAndGk(): ColumnOptions {
  return {type: DataType.Int, primaryKey: true, generatedKey: true};
}

export function longPkAndGk(): ColumnOptions {
  return {type: DataType.Long, primaryKey: true, generatedKey: true}
}

export function belongsTo(refName: string, options?: AssociationOptions): AssociationOptions {
  return {type: AssociationType.BelongsTo, refName, ...options};
}

export function hasMany(refName: string, options?: AssociationOptions): AssociationOptions{
  return {type: AssociationType.HasMany, refName, ...options};
}

export function hasOne(refName: string, options?: AssociationOptions): AssociationOptions {
  return {type: AssociationType.HasOne, refName, ...options};
}

export function belongsToMany(refName: string, middleName: string, options?: AssociationOptions): AssociationOptions {
  return {type: AssociationType.BelongsToMany, refName, middleName, ...options};
}

export {DataType, OrqlExecutor};

export default OrqlExecutor;