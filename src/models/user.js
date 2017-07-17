
import { routerRedux } from 'dva/router';
import { parse } from 'qs'
import { queryUser } from '../services/user';

const config =  require('../config');

export default {

  namespace: 'user',

  state: {
  },

  subscriptions: {
    setup({ dispatch, history }) {  
      return history.listen(({ pathname }) => {
        if(pathname!=config.loginPage)
          dispatch({ type: 'queryUser' });
      });
    },
  },

  effects: {
    *queryUser ({
      payload,
    }, { call, put }) {
      const { response, err } = yield call(queryUser)
      if(err || !response)
          console.log(err);
      else if(response.ok && response.payload){
        yield put({ type: 'queryUserSuccess', payload: JSON.parse(response.payload) })
      }
    },
  },

  reducers: {
    queryUserSuccess(state, action) {
      return { ...state, ...action.payload };
    },
  },

};
