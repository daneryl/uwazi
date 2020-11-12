import api from 'app/Users/components/usergroups/UserGroupsAPI';
import { Dispatch } from 'redux';
import { IStore } from 'app/istore';
import { UserGroupSchema } from 'shared/types/userGroupType';
import { RequestParams } from 'app/utils/RequestParams';
import * as actions from '../actions';

describe('User Groups actions', () => {
  const userGroups = [{ _id: 'group1' }];
  let dispatch: Dispatch<IStore>;

  beforeEach(() => {
    dispatch = jasmine.createSpy('dispatch');
    spyOn(api, 'getUserGroups').and.returnValue(Promise.resolve(userGroups));
    spyOn(api, 'saveUserGroup').and.returnValue(Promise.resolve({ _id: 'group 1' }));
  });

  describe('Load user groups', () => {
    it('should dispatch the fetched user groups ', async () => {
      await actions.loadUserGroups()(dispatch);
      expect(api.getUserGroups).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({ type: 'userGroups/SET', value: userGroups });
    });
  });

  describe('Save user group', () => {
    it('should dispatch the updated user group ', async () => {
      const userGroup: UserGroupSchema = { name: 'new group', members: [] };
      await actions.saveUserGroup(userGroup)(dispatch);
      expect(api.saveUserGroup).toHaveBeenCalledWith(new RequestParams(userGroup));
      expect(dispatch).toHaveBeenCalledWith({ type: 'userGroups/PUSH', value: { _id: 'group 1' } });
    });
  });
});
