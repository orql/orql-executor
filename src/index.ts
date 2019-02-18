import {AssociationOptions, AssociationType, DataType} from './Schema';
import OrqlMapper from './OrqlMapper';

export function intPkAndGk() {
  return {type: DataType.Int, pkAndGk: true};
}

export function longPkAndGk() {
  return {type: DataType.Long, pkAndGk: true}
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

export {DataType, OrqlMapper};

export default OrqlMapper;