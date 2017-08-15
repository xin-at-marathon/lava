import React from 'react';
import { Router, Route } from 'dva/router';
import PropTypes from 'prop-types'
import {  routerRedux } from 'dva/router'
import qs from 'qs'

import { request } from './utils'
const config = require('./config');
const { api } = config
import fetch from 'dva/fetch';

const LayoutDefault = require('./routes/LayoutDefault/');
const LayoutShop = require('./routes/LayoutShop/');
const LayoutUser = require('./routes/LayoutUser/');

const registerModel = (app, model) => {
  if (!(app._models.filter(m => m.namespace === model.namespace).length === 1)) {
    app.model(model)
  }
}

const Routers = function ({ history, app }) {

  function init(nextState, replace, cb){
    function checkStatus(response) {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      const error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
    function parseJSON(response) {
      return response.json();
    }
    function handleResponse(response){
      if(response.ok){
        const config = response.payload
        app._store.dispatch({ type: 'app/updateJsApiConfig', payload: config })

        console.log('wechat jsapi init as server returns config')
        console.log(config)
      }else{
        const fail = response.payload
        console.log(`wechat jsapi init fail because of ${fail.errmsg}`)
      }
      cb()
    }
    function handleError(err){
      console.log(`check login NOT pass because of ${err}, redirect url to ${login}`)
      window.location = login
      cb()
    }

    //获得全局状态
    const state = app._store.getState();
    let catalog = state.menu.catalog

    //从localStorage恢复菜单
    const stored_menu = JSON.parse(window.localStorage.getItem('menu'))
    if(stored_menu){
      //恢复原来保存的点菜数量
      for(var t in catalog){
        for(var i in catalog[t]){
          if( stored_menu[t]&&
              stored_menu[t][i]&&
              stored_menu[t][i].quantity>0)
            catalog[t][i].quantity = stored_menu[t][i].quantity
        }
      }

      app._store.dispatch({ type: 'menu/updateCatalog', payload: catalog })
    }

    //再从服务器获取jsapi config
    const url = window.location.href
    if(!state.app.jsapi_config){
      fetch(api.getWechatJsapiConfig, {
        method: 'POST',
        fetchType: 'CORS',
        credentials: 'include',
        headers: {
          /*Must have this to make Nutz backend recognize.*/
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: qs.stringify({url})})
      .then(checkStatus)
      .then(parseJSON)
      .then(handleResponse)
      .catch(handleError);
    }else{
      cb()
      console.log('check jsapi passed because of local config exists.')
    }
  }

  function checkLogin(nextState, replace, cb) {
    
    //转义反斜杆是因为微信说state里面只支持字母与数字
    const dest = nextState.location.pathname.replace(/\//g,'777')
    const login = config.wechatLoginUrl.replace('DESTINATION',dest)

    function checkStatus(response) {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      const error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
    function parseJSON(response) {
      return response.json();
    }

    function handleResponse(response){
      if(response.ok){
        const user = response.payload
        app._store.dispatch({ type: 'user/updateUser', payload: user })

        if(user.delivery)
          app._store.dispatch({ type: 'user/updateDelivery', payload: user.delivery })

        console.log('check Login passed as server returns user')
        console.log(user)
      }else{
        const fail = response.payload
        console.log(`check login NOT pass because of ${fail.errmsg}, redirect url to ${login}`)
        window.location = login
      }
      cb()
    }
    function handleError(err){
      console.log(`check login NOT pass because of ${err}, redirect url to ${login}`)
      window.location = login
      cb()
    }

    //get stored user
    const {user} = app._store.getState();
    if(!user.id){
      //先从服务get，看server session是否还有效      
      fetch(api.getMe, {method: 'get', fetchType: 'CORS', credentials: 'include'})
      .then(checkStatus)
      .then(parseJSON)
      .then(handleResponse)
      .catch(handleError);

    }else{
      cb()
      console.log('check Login passed because of local user exists.')
    }
  }

  const layout_shop_children = [
    {
      path: 'home',
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/HomePage/controller'))
          cb(null, require('./routes/HomePage/'))
        }, 'HomePage')
      },
    },
    {
      path: 'item/:type/:id',
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/ItemPage/controller'))
          cb(null, require('./routes/ItemPage/'))
        }, 'ItemPage')
      },
    },
  ]

  const layout_user_children = [
    {
      path: 'home',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/UserHomePage/controller'));
          cb(null, require('./routes/UserHomePage/'));
        }, 'UserHomePage')
      },
    },
    {
      path: 'address',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/AddressPage/controller'));
          cb(null, require('./routes/AddressPage/'))
        }, 'AddressPage')
      },
    },
    {
      path: 'cart',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/CartPage/controller'));
          cb(null, require('./routes/CartPage/'))
        }, 'CartPage')
      },
    },
    {
      path: 'order/list',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/OrderListPage/controller'));
          cb(null, require('./routes/OrderListPage/'));
        }, 'OrderListPage')
      },
    },
    {
      path: 'order/show/:id',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/OrderShowPage/controller'));
          cb(null, require('./routes/OrderShowPage/'));
        }, 'OrderShowPage')
      },
    },
    {
      path: 'order/edit/:id',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/OrderEditPage/controller'));
          cb(null, require('./routes/OrderEditPage/'));
        }, 'OrderEditPage')
      },
    },
    {
      path: 'wechatpay/:id',
      onEnter: checkLogin,
      getComponent (nextState, cb) {
        require.ensure([], require => {
          registerModel(app, require('./routes/WechatPayPage/controller'));
          cb(null, require('./routes/WechatPayPage/'));
        }, 'WechatPayPage')
      },
    },
  ]

  const routes = [
    {
      path: '/',
      onEnter: init,
      component: LayoutDefault,
      childRoutes: [
        {
          path: 'shop/',
          component: LayoutShop,
          childRoutes: layout_shop_children,
        },
        {
          path: 'user/',
          component: LayoutUser,
          childRoutes: layout_user_children,
        },
      ],
    },   
  ]

  return <Router history={history} routes={routes} />
}

Routers.propTypes = {
  history: PropTypes.object,
  app: PropTypes.object,
}

export default Routers
