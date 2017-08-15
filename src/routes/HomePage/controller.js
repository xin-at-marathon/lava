
import { routerRedux } from 'dva/router'
import pathToRegexp from 'path-to-regexp';
import {calculateOrderPrice} from '../../utils/price'
import qs from 'qs'
import {wechat_share} from '../../utils/wechat'

const config = require('../../config');

function menuToQs(menu){
  const qs_menu = {}
  for(var t in menu){
    for(var i in menu[t]){
      var quantity = menu[t][i].quantity
      if(quantity>0)
        qs_menu[i] = quantity
    }
  }
  return qs.stringify(qs_menu)
}



export default {

  namespace: 'HomePage',

  state: {
    ui:{
      title: null,
      imageLoading: true
    }
  },

  subscriptions: {
  },

  effects: {

    *componentWillMount({payload,}, { call, select, put }) {
      let title = config.name
      if(payload.name)
        title = payload.name
      yield put({type:'updateUI',payload:{title}})

      //这是当前的新菜单，quantity都是0
      const { menu, user, app } = yield(select(_ => _))
      const { catalog } = menu

      if(Object.keys(payload).length > 0){
        //从url中恢复
        for(var t in catalog){
          for(var i in catalog[t]){
            if( payload[i] )
              catalog[t][i].quantity = parseInt(payload[i])
            else
              catalog[t][i].quantity = 0
          }
        }
      }else{
        //从localStorage恢复
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
        }
      }

      //save menu to localStorage
      window.localStorage.setItem('menu', JSON.stringify(catalog))

      //重新计算
      const {total, saving, items} = calculateOrderPrice(catalog)

      yield put({ 
        type: 'menu/updateModel', 
        payload: {catalog, total, saving, items}
      })

      //微信分享
      if(null == app.jsapi_config)
        return

      title = payload.name?payload.name:config.name
      title = user.id?`${user.nickname}分享了【${title}】`:title
      const jsapi_config = app.jsapi_config
      const qs = menuToQs(catalog)
      const link = qs?`${config.rootUrl}app/?hlhs#/shop/home?${qs}`:`${config.rootUrl}app/?hlhs#/shop/home`
      const imgUrl = `${config.rootUrl}app/res/suite.jpg`
      const desc = '购买套餐，更有十足优惠'
      wechat_share(jsapi_config,title,link,imgUrl,desc)
    },

  },

  reducers: {
    updateUI(state,action){
      return {
        ...state,
        ui: {...state.ui, ...action.payload}
      }
    }

  },


};
