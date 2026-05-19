(function(_0x3c8125,_0x6505ef) {
  const _0x5c7311=a0_0x5f17,_0x331cf6=_0x3c8125();
  while(true) {
    try {
      const _0x115d4d=parseInt("18199LMnjiE")/0x1*(parseInt("2ImFFAA")/0x2)+parseInt("328929qWkfBk")/0x3+parseInt("704732sLFsQa")/0x4+parseInt("5bbEgdi")/0x5*(-parseInt("2009094vfwmfM")/0x6)+-parseInt("121996GCraTx")/0x7*(parseInt("152kVJDbZ")/0x8)+parseInt("19062BswpjV")/0x9*(parseInt("870dScTds")/0xa)+parseInt("3870361UjdmJa")/0xb;
      if(_0x115d4d===_0x6505ef)break;
      else _0x331cf6['push'](_0x331cf6['shift']());
    } catch(_0x14770f) {
      _0x331cf6['push'](_0x331cf6['shift']());
    }
  }
}
(a0_0x463c,0x2a851));
let currentAction=null,passwordVerified=false;
document['addEventListener']('DOMContentLoaded',async()=> {
  const _0x13a584=a0_0x5f17;
  await licenseManager["init"](),checkAdminPassword();
}
);
async function checkAdminPassword() {
  const _0x172518=a0_0x5f17,_0x369b74= {
    'DmECA':function(_0x553f63,_0x56ef56) {
      return _0x553f63+_0x56ef56;
    },
    'geYxk':"rgba(200, 100, 100, 0.2)",'UDvvm':function(_0x238037) {
      return _0x238037();
    },
    'szooI':"[Admin] Nenhuma senha de admin configurada",'xGLvR':function(_0x3684f2,_0x2bac7b) {
      return _0x3684f2===_0x2bac7b;
    },
    'UoCPT':"GffsZ",'EzoWf':"[Admin] Senha de admin encontrada, pedindo verificacao",'axNoe':function(_0x3e3fb2) {
      return _0x3e3fb2();
    },
    'KMAgz':"ZoUhn",'mTrNX':"[Admin] Erro ao verificar senha:"
  };
  try {
    const _0x31fc80=await _0x369b74["UDvvm"](getAdminPasswordFromCloud);
    !_0x31fc80?(console["log"](_0x369b74["szooI"]),passwordVerified=true,_0x369b74["UDvvm"](hidePasswordModal),initializePanel()):_0x369b74["xGLvR"]('GffsZ',_0x369b74['UoCPT'])?(console["log"](_0x369b74['EzoWf']),_0x369b74["axNoe"](showPasswordModal)):_0x50bbac["success"]?(_0x6048db['style']["background"]="rgba(100, 200, 100, 0.2)",_0x3aebf6["textContent"]=_0x369b74["DmECA"]('✅ ',_0x461226["message"])):(_0x156dae["style"]["background"]=_0x369b74["geYxk"],_0x5cffb2["textContent"]='❌ '+_0x33a785["message"]);
  } catch(_0x28a672) {
    _0x369b74["KMAgz"]!=="ZoUhn"?_0x369b74['UDvvm'](_0x5f9c89):(console["error"](_0x369b74["mTrNX"],_0x28a672),_0x369b74["UDvvm"](showPasswordModal));
  }
}
function showPasswordModal() {
  const _0x2418ea=a0_0x5f17,_0x126b34= {
    'zkIFK':"show",'cWdVj':'alert show alert-','ruhpN':"active",'WNIvC':"Firebase não carregado",'gDVSR':"❌ Firebase não carregado",'wTrIi':function(_0x489ea0,_0x49ea70) {
      return _0x489ea0===_0x49ea70;
    },
    'zxbei':"Enter",'jVXFk':'BJhMh','IiDQH':'otmlH','UndOb':function(_0x3247f7) {
      return _0x3247f7();
    },
    'haWkv':"password-modal",'eJXlm':'flex','AWIZw':'btn-verify-password','NvHhP':"btn-close-panel",'VSrSq':'toLvo','dcNPD':function(_0x4d839b,_0x291095) {
      return _0x4d839b===_0x291095;
    }
  },
  _0x29e9db=document["getElementById"](_0x126b34["haWkv"]);
  if(_0x29e9db) {
    _0x29e9db['style']['display']=_0x126b34['eJXlm'],_0x29e9db['classList']['add'](_0x126b34["zkIFK"]);
    const _0x4be1ab=document['getElementById'](_0x126b34["AWIZw"]),_0x117675=document["getElementById"](_0x126b34["NvHhP"]),_0x5f9157=document["getElementById"]("access-password");
    if(_0x4be1ab) {
      if(_0x126b34["VSrSq"]===_0x126b34["VSrSq"])_0x4be1ab["onclick"]=verifyAdminAccess;
      else {
        const _0x238fec= {
          'gySmm':_0x126b34["zkIFK"]
        };
        _0x10f649["textContent"]=_0x300389,_0x48158b["className"]=_0x126b34['cWdVj']+_0x32fe9e,_0xb5e06a(()=> {
          const _0x260043=_0x2418ea;
          _0x3c86dd[_0x260043(0x216)][_0x260043(0x2dd)](_0x238fec[_0x260043(0x2c2)]);
        },
        0x1388);
      }
    }
    _0x117675&&(_0x126b34['dcNPD']("ypWef","ypWef")?_0x117675["onclick"]=()=>window["close"]():_0x29e6d8['classList']['remove'](_0x126b34["ruhpN"])),_0x5f9157&&(_0x5f9157["onkeypress"]=_0x29af4b=> {
      const _0x3cc053=_0x2418ea,_0x1165a3= {
        'Kolnl':_0x126b34[_0x3cc053(0x346)],'rhlri':_0x126b34['gDVSR']
      };
      if(_0x126b34['wTrIi'](_0x29af4b[_0x3cc053(0x18c)],_0x126b34[_0x3cc053(0x20c)])) {
        if(_0x126b34[_0x3cc053(0x24a)]!==_0x126b34[_0x3cc053(0x364)])_0x126b34['UndOb'](verifyAdminAccess);
        else {
          _0x4b3d3e[_0x3cc053(0x2a3)](_0x1165a3['Kolnl']);
          if(_0x33b37a)_0x531ab6['textContent']=_0x1165a3[_0x3cc053(0x2e3)];
          return;
        }
      }
    },
    _0x5f9157["focus"]());
  }
}
function hidePasswordModal() {
  const _0x6ef54a=a0_0x5f17,_0x133126= {
    'UoGSS':"password-modal",'IdGid':"none",'VUYAG':'show'
  },
  _0x256c54=document['getElementById'](_0x133126["UoGSS"]);
  _0x256c54&&(_0x256c54["style"]["display"]=_0x133126["IdGid"],_0x256c54["classList"]["remove"](_0x133126["VUYAG"]));
}
async function verifyAdminAccess() {
  const _0x3672f7=a0_0x5f17,_0x471ded= {
    'XMurq':function(_0x2c2867,_0x3ebe18,_0x435a9d,_0x3587f3) {
      return _0x2c2867(_0x3ebe18,_0x435a9d,_0x3587f3);
    },
    'azRVI':"alert-generate",'dJHrZ':"Gere uma licenca primeiro!",'ArIYQ':"error",'ldycW':function(_0x1dfbd0,_0x388ea1) {
      return _0x1dfbd0(_0x388ea1);
    },
    'uESxq':"Digite a senha!",'URplQ':function(_0x23e2e7,_0xd87001) {
      return _0x23e2e7===_0xd87001;
    },
    'MgZmv':"HgKaY",'vtgYi':"wjZkx",'SJSRd':function(_0x39fd46,_0xd2ad8b) {
      return _0x39fd46(_0xd2ad8b);
    },
    'YreWC':'Nenhuma senha configurada!','NiikC':function(_0x119e27,_0x58ea29) {
      return _0x119e27(_0x58ea29);
    },
    'GyQkO':function(_0x335a37,_0x278048) {
      return _0x335a37===_0x278048;
    },
    'gDjeX':"[Admin] Senha correta!",'zbiEn':function(_0xe6126b) {
      return _0xe6126b();
    },
    'ruKQN':'[Admin] Senha incorreta!','yBekY':"Senha incorreta!",'FGZJK':"[Admin] Erro ao verificar senha:",'ZRJcN':function(_0x4bfbb6,_0xf9dd4f) {
      return _0x4bfbb6(_0xf9dd4f);
    },
    'ojpQe':function(_0x34b37e,_0x36f41a) {
      return _0x34b37e+_0x36f41a;
    },
    'paMHS':"Erro ao verificar senha: "
  },
  _0x5f5747=document["getElementById"]('access-password'),_0x23129d=_0x5f5747?_0x5f5747['value']:'';
  if(!_0x23129d) {
    _0x471ded["ldycW"](alert,_0x471ded["uESxq"]);
    return;
  }
  try {
    if(_0x471ded["URplQ"](_0x471ded["MgZmv"],_0x471ded["vtgYi"])) {
      _0x471ded['XMurq'](_0x37361c,_0x471ded["azRVI"],_0x471ded["dJHrZ"],_0x471ded['ArIYQ']);
      return;
    } else {
      const _0x414f0f=await getAdminPasswordFromCloud();
      if(!_0x414f0f) {
        _0x471ded["SJSRd"](alert,_0x471ded['YreWC']);
        return;
      }
      const _0x14cfd3=_0x471ded["NiikC"](btoa,_0x23129d);
      if(_0x471ded["GyQkO"](_0x14cfd3,_0x414f0f)) {
        const _0x5273d5='3|2|4|0|1'["split"]('|');
        let _0x34d4d9=0x0;
        while(true) {
          switch(_0x5273d5[_0x34d4d9++]) {
            case'0':if(_0x5f5747)_0x5f5747["value"]='';
            continue;
            case'1':initializePanel();
            continue;
            case'2':passwordVerified=true;
            continue;
            case'3':console["log"](_0x471ded["gDjeX"]);
            continue;
            case'4':_0x471ded["zbiEn"](hidePasswordModal);
            continue;
          }
          break;
        }
      } else console["log"](_0x471ded["ruKQN"]),alert(_0x471ded["yBekY"]),_0x5f5747&&(_0x5f5747["value"]='',_0x5f5747["focus"]());
    }
  } catch(_0x4237fa) {
    console["error"](_0x471ded['FGZJK'],_0x4237fa),_0x471ded['ZRJcN'](alert,_0x471ded["ojpQe"](_0x471ded["paMHS"],_0x4237fa["message"]));
  }
}
function a0_0x5f17(_0x106f27,_0xd28e0c) {
  _0x106f27=_0x106f27-0x151;
  const _0x463cfb=a0_0x463c();
  let _0x5f1776=_0x463cfb[_0x106f27];
  if(a0_0x5f17['JmnKmr']===undefined) {
    var _0x1b06e2=function(_0x4b7a1b) {
      const _0x42f8db='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
      let _0xc18af4='',_0x2759a9='';
      for(let _0x2bd81e=0x0,_0x52cf6b,_0x306d9a,_0x18edf9=0x0;
      _0x306d9a=_0x4b7a1b['charAt'](_0x18edf9++);
      ~_0x306d9a&&(_0x52cf6b=_0x2bd81e%0x4?_0x52cf6b*0x40+_0x306d9a:_0x306d9a,_0x2bd81e++%0x4)?_0xc18af4+=String['fromCharCode'](0xff&_0x52cf6b>>(-0x2*_0x2bd81e&0x6)):0x0) {
        _0x306d9a=_0x42f8db['indexOf'](_0x306d9a);
      }
      for(let _0x16552c=0x0,_0x887d29=_0xc18af4['length'];
      _0x16552c<_0x887d29;
      _0x16552c++) {
        _0x2759a9+='%'+('00'+_0xc18af4['charCodeAt'](_0x16552c)['toString'](0x10))['slice'](-0x2);
      }
      return decodeURIComponent(_0x2759a9);
    };
    a0_0x5f17['uRCICA']=_0x1b06e2,a0_0x5f17['qRUepX']= {
    },
    a0_0x5f17['JmnKmr']=true;
  }
  const _0x3f6718=_0x463cfb[0x0],_0x243696=_0x106f27+_0x3f6718,_0x44bd78=a0_0x5f17['qRUepX'][_0x243696];
  return!_0x44bd78?(_0x5f1776=a0_0x5f17['uRCICA'](_0x5f1776),a0_0x5f17['qRUepX'][_0x243696]=_0x5f1776):_0x5f1776=_0x44bd78,_0x5f1776;
}
function initializePanel() {
  const _0x2bb892=a0_0x5f17,_0x2677d1= {
    'hUXHO':function(_0x1807cb) {
      return _0x1807cb();
    }
  };
  setupEventListeners(),_0x2677d1["hUXHO"](loadDashboard),_0x2677d1["hUXHO"](loadManageLicenses);
}
function setupEventListeners() {
  const _0x217a58=a0_0x5f17,_0x3aed79= {
    'HPobI':'data-tab','pNXDm':function(_0x361c31,_0x2b019c) {
      return _0x361c31(_0x2b019c);
    },
    'JupHB':'click','faChr':function(_0x20f807) {
      return _0x20f807();
    },
    'Usnrc':function(_0x2c130f,_0x1d387c) {
      return _0x2c130f===_0x1d387c;
    },
    'QSsiY':"RBihF",'FEFWk':'confirm-modal','QrgeR':function(_0x5c6475) {
      return _0x5c6475();
    },
    'ZtEWN':".tab-btn",'sJywh':"btn-export",'xUOAp':"btn-copy-export",'zpkCJ':"btn-import",'RCCQI':"btn-set-password",'ewMlG':"btn-clear-all",'IqRXW':"btn-sync-firebase",'LiaRK':'btn-test-firebase','PdEcT':"btn-confirm",'FSodO':"btn-cancel",'nsLnT':"modal-close"
  };
  document["querySelectorAll"](_0x3aed79["ZtEWN"])["forEach"](_0x3ec63f=> {
    const _0x32a24a=_0x217a58;
    _0x3ec63f[_0x32a24a(0x37f)](_0x3aed79[_0x32a24a(0x26a)],_0x5d71dc=> {
      const _0x160e03=_0x32a24a,_0x2fb40c=_0x5d71dc['target']['getAttribute'](_0x3aed79[_0x160e03(0x1dd)]);
      _0x3aed79[_0x160e03(0x305)](switchTab,_0x2fb40c);
    }
    );
  }
  );
  const _0x54fd22=document['getElementById']('btn-generate');
  if(_0x54fd22)_0x54fd22["addEventListener"]("click",generateNewLicense);
  const _0x3189bf=document["getElementById"]('btn-copy-generated');
  if(_0x3189bf)_0x3189bf["addEventListener"](_0x3aed79["JupHB"],copyToClipboard);
  const _0x5586fd=document['getElementById'](_0x3aed79["sJywh"]);
  if(_0x5586fd)_0x5586fd["addEventListener"](_0x3aed79["JupHB"],exportLicenses);
  const _0x4d98b7=document["getElementById"](_0x3aed79["xUOAp"]);
  if(_0x4d98b7)_0x4d98b7['addEventListener'](_0x3aed79["JupHB"],copyExport);
  const _0x30d7aa=document["getElementById"](_0x3aed79['zpkCJ']);
  if(_0x30d7aa)_0x30d7aa["addEventListener"](_0x3aed79["JupHB"],importLicenses);
  const _0x5f4c21=document["getElementById"](_0x3aed79["RCCQI"]);
  if(_0x5f4c21)_0x5f4c21['addEventListener'](_0x3aed79["JupHB"],setAdminPassword);
  const _0x597829=document["getElementById"](_0x3aed79['ewMlG']);
  if(_0x597829)_0x597829["addEventListener"](_0x3aed79["JupHB"],clearAllLicenses);
  const _0x76f313=document['getElementById'](_0x3aed79["IqRXW"]);
  if(_0x76f313)_0x76f313["addEventListener"](_0x3aed79['JupHB'],syncLicensesWithFirebase);
  const _0x218669=document["getElementById"](_0x3aed79["LiaRK"]);
  if(_0x218669)_0x218669["addEventListener"]('click',testFirebaseConnection);
  const _0x334595=document['getElementById']('btn-close');
  if(_0x334595)_0x334595["addEventListener"](_0x3aed79['JupHB'],()=>window["close"]());
  const _0x2fd387=document["getElementById"](_0x3aed79["PdEcT"]);
  if(_0x2fd387)_0x2fd387["addEventListener"](_0x3aed79["JupHB"],confirmAction);
  const _0x2a4ed1=document['getElementById'](_0x3aed79['FSodO']);
  if(_0x2a4ed1)_0x2a4ed1["addEventListener"](_0x3aed79["JupHB"],closeModal);
  const _0x28b708=document["getElementById"](_0x3aed79["nsLnT"]);
  if(_0x28b708)_0x28b708["addEventListener"]("click",closeModal);
  const _0x290878=document["getElementById"](_0x3aed79['FEFWk']);
  _0x290878&&_0x290878["addEventListener"]('click',_0x148739=> {
    const _0x4c0bf4=_0x217a58;
    _0x3aed79['Usnrc'](_0x3aed79[_0x4c0bf4(0x32d)],_0x4c0bf4(0x234))?_0x3aed79[_0x4c0bf4(0x35b)](_0x4657d8):_0x3aed79[_0x4c0bf4(0x1e5)](_0x148739[_0x4c0bf4(0x2b4)]['id'],_0x3aed79[_0x4c0bf4(0x32a)])&&_0x3aed79[_0x4c0bf4(0x196)](closeModal);
  }
  );
}
function switchTab(_0x3b46f4) {
  const _0x15dca3=a0_0x5f17,_0x8ab45c= {
    'zNwje':"active",'SAgVL':function(_0x169d66,_0x21bbf3,_0x10911e,_0x45c1dc) {
      return _0x169d66(_0x21bbf3,_0x10911e,_0x45c1dc);
    },
    'HkviO':"alert-generate",'jcQwk':function(_0x4648cd,_0x2ae35e) {
      return _0x4648cd+_0x2ae35e;
    },
    'Xwyfo':"error",'vmfPx':function(_0x131fdd,_0x2909d5) {
      return _0x131fdd!==_0x2909d5;
    },
    'ExSJZ':'MTLPy','aliBZ':"Erro ao copiar: ",'YmEJs':".tab-content",'BfUGV':".tab-btn",'jprcj':function(_0x11ab91,_0x406352) {
      return _0x11ab91===_0x406352;
    },
    'PDRWl':"dashboard",'rjPsX':function(_0x59c7b0,_0x4eba72) {
      return _0x59c7b0!==_0x4eba72;
    },
    'vIYnI':"nsmZu",'dgKIc':'DftEw','NMQaA':function(_0x4f1369) {
      return _0x4f1369();
    },
    'VOOkH':"manage"
  };
  document['querySelectorAll'](_0x8ab45c["YmEJs"])['forEach'](_0x14dc48=> {
    const _0x56684e=_0x15dca3;
    _0x14dc48[_0x56684e(0x216)]['remove'](_0x8ab45c[_0x56684e(0x303)]);
  }
  ),document['querySelectorAll'](_0x8ab45c["BfUGV"])["forEach"](_0x2b0bf6=> {
    const _0x4f6e6c=_0x15dca3;
    _0x8ab45c[_0x4f6e6c(0x16f)](_0x8ab45c[_0x4f6e6c(0x1cf)],_0x8ab45c[_0x4f6e6c(0x1cf)])?_0x8ab45c[_0x4f6e6c(0x250)](_0x2955da,_0x8ab45c[_0x4f6e6c(0x1fa)],_0x8ab45c[_0x4f6e6c(0x201)](_0x4f6e6c(0x2c0),_0x2ec742['message']),_0x8ab45c[_0x4f6e6c(0x2d6)]):_0x2b0bf6['classList'][_0x4f6e6c(0x2dd)](_0x4f6e6c(0x247));
  }
  );
  const _0x26e93b=document["getElementById"](_0x3b46f4);
  if(_0x26e93b)_0x26e93b["classList"]['add'](_0x8ab45c['zNwje']);
  const _0x5843bc=document["querySelector"]("[data-tab=\""+_0x3b46f4+'\"]');
  if(_0x5843bc)_0x5843bc["classList"]["add"](_0x8ab45c["zNwje"]);
  if(_0x8ab45c["jprcj"](_0x3b46f4,_0x8ab45c["PDRWl"]))_0x8ab45c["rjPsX"](_0x8ab45c["vIYnI"],_0x8ab45c["dgKIc"])?_0x8ab45c['NMQaA'](loadDashboard):_0x8ab45c['SAgVL'](_0x284a5e,_0x8ab45c['HkviO'],_0x8ab45c["jcQwk"](_0x8ab45c["aliBZ"],_0x11a48b["message"]),_0x8ab45c["Xwyfo"]);
  else _0x8ab45c["jprcj"](_0x3b46f4,_0x8ab45c["VOOkH"])&&loadManageLicenses();
}
async function loadDashboard() {
  const _0x4c4a14=a0_0x5f17,_0x2f6093= {
    'aufdT':function(_0x35081a,_0x52df35,_0x240156,_0x30ea14) {
      return _0x35081a(_0x52df35,_0x240156,_0x30ea14);
    },
    'XyRqc':"alert-settings",'IjuNt':"Digite uma senha!",'OcOAJ':'error','DWykN':"mNaGr",'yxoBy':"status-active",'vqLOa':'Ativa','GhOey':'Inativa','MzGOu':"Sim",'DshjR':'Nao','PNMMi':"pt-BR",'sUXlp':'Ativar','awmlI':function(_0x3ce38c,_0x333293) {
      return _0x3ce38c===_0x333293;
    },
    'PFtio':"confirm-modal",'DnLDD':function(_0x21351f) {
      return _0x21351f();
    },
    'VFdQw':"stats-grid",'kLjOy':"Mhkru",'MkjGu':"OcCwL",'XQkLT':'<tr><td colspan=\"5\" style=\"text-align: center; color: var(--text-secondary);\">Nenhuma licenca criada ainda</td></tr>'
  },
  _0x578624=await licenseManager['getStats'](),_0x3b2c24=await licenseManager["getAllLicenses"](),_0x335a4a=document["getElementById"](_0x2f6093["VFdQw"]);
  _0x335a4a&&(_0x335a4a["innerHTML"]="\n            <div class=\"stat-card\">\n                <div class=\"stat-number\">"+_0x578624["total"]+"</div>\n                <div class=\"stat-label\">Total de Licencas</div>\n            </div>\n            <div class=\"stat-card\">\n                <div class=\"stat-number\">"+_0x578624['active']+"</div>\n                <div class=\"stat-label\">Ativas</div>\n            </div>\n            <div class=\"stat-card\">\n                <div class=\"stat-number\">"+_0x578624['activated']+'</div>\n                <div class=\"stat-label\">Ativadas</div>\n            </div>\n            <div class=\"stat-card\">\n                <div class=\"stat-number\">'+_0x578624["available"]+'</div>\n                <div class=\"stat-label\">Disponiveis</div>\n            </div>\n            <div class=\"stat-card\">\n                <div class=\"stat-number\">'+_0x578624["expired"]+'</div>\n                <div class=\"stat-label\">Expiradas</div>\n            </div>\n        ');
  const _0x461870=document["getElementById"]("licenses-tbody");
  _0x461870&&(_0x461870["innerHTML"]='',_0x3b2c24["forEach"](_0x4d4aa0=> {
    const _0x39f8f2=_0x4c4a14;
    if(_0x39f8f2(0x17d)!==_0x2f6093[_0x39f8f2(0x2e1)]) {
      _0x2f6093['aufdT'](_0x264f79,_0x2f6093[_0x39f8f2(0x2d1)],_0x2f6093[_0x39f8f2(0x22b)],_0x2f6093[_0x39f8f2(0x32c)]);
      return;
    } else {
      const _0x31112f=document['createElement']('tr'),_0x286720=_0x4d4aa0[_0x39f8f2(0x247)]?_0x2f6093['yxoBy']:_0x39f8f2(0x371),_0x320bd2=_0x4d4aa0['active']?_0x2f6093[_0x39f8f2(0x189)]:_0x2f6093[_0x39f8f2(0x1f6)],_0xe9099b=_0x4d4aa0['activated']?_0x2f6093[_0x39f8f2(0x258)]:_0x2f6093[_0x39f8f2(0x203)],_0x2e1328=new Date(_0x4d4aa0[_0x39f8f2(0x1ee)])[_0x39f8f2(0x1c7)](_0x2f6093['PNMMi']);
      _0x31112f[_0x39f8f2(0x248)]=_0x39f8f2(0x182)+_0x4d4aa0[_0x39f8f2(0x18c)]+'</div></td>\n                <td><span class=\"status-badge-small '+_0x286720+'\">'+_0x320bd2+_0x39f8f2(0x174)+_0xe9099b+_0x39f8f2(0x202)+_0x2e1328+_0x39f8f2(0x262)+_0x4d4aa0['key']+_0x39f8f2(0x2f5)+_0x4d4aa0[_0x39f8f2(0x18c)]+_0x39f8f2(0x1ac)+_0x4d4aa0[_0x39f8f2(0x247)]+_0x39f8f2(0x319)+(_0x4d4aa0[_0x39f8f2(0x247)]?_0x39f8f2(0x2ff):_0x2f6093[_0x39f8f2(0x2e9)])+_0x39f8f2(0x2fd)+_0x4d4aa0[_0x39f8f2(0x18c)]+_0x39f8f2(0x20b),_0x461870['appendChild'](_0x31112f);
    }
  }
  ),_0x3b2c24["length"]===0x0&&(_0x2f6093["awmlI"](_0x2f6093["kLjOy"],_0x2f6093["MkjGu"])?SxPhgn['awmlI'](_0x4c8913["target"]['id'],SxPhgn['PFtio'])&&SxPhgn["DnLDD"](_0x43ec30):_0x461870["innerHTML"]=_0x2f6093['XQkLT'])),_0x2f6093['DnLDD'](attachTableButtonListeners);
}
async function loadManageLicenses() {
  const _0x367c58=a0_0x5f17,_0x47636d= {
    'WOoIY':'status-active','ltsSh':"status-inactive",'lAWzO':'Ativa','TLILA':"Inativa",'Xavus':"pt-BR",'pkTRx':'Sem nome','NUGsj':"Sem telefone",'kFdMi':'data-tab','XBOrs':function(_0x11e2bf,_0x34dae4) {
      return _0x11e2bf(_0x34dae4);
    },
    'JpKIm':'manage-tbody','lCpLh':function(_0x3fc92d,_0x11e234) {
      return _0x3fc92d!==_0x11e234;
    },
    'cQPRD':"SsXJh",'mfwfi':"areDH",'hWpXx':"<tr><td colspan=\"8\" style=\"text-align: center; color: var(--text-secondary);\">Nenhuma licenca criada ainda</td></tr>",'gPhoK':function(_0x38d16d) {
      return _0x38d16d();
    }
  },
  _0x5e7f71=await licenseManager["getAllLicenses"](),_0x228f4d=document["getElementById"](_0x47636d['JpKIm']);
  if(_0x228f4d) {
    if(_0x47636d['lCpLh'](_0x47636d['cQPRD'],_0x47636d["mfwfi"]))_0x228f4d["innerHTML"]='',_0x5e7f71["forEach"](_0xdd5f2c=> {
      const _0x5b02d0=_0x367c58,_0x315752=document[_0x5b02d0(0x162)]('tr'),_0x48c0a0=_0xdd5f2c[_0x5b02d0(0x247)]?_0x47636d[_0x5b02d0(0x318)]:_0x47636d[_0x5b02d0(0x2bc)],_0x121b80=_0xdd5f2c['active']?_0x47636d[_0x5b02d0(0x25f)]:_0x47636d[_0x5b02d0(0x188)],_0x16b811=_0xdd5f2c[_0x5b02d0(0x200)]?_0x5b02d0(0x1db):_0x5b02d0(0x249),_0x201234=new Date(_0xdd5f2c[_0x5b02d0(0x1c5)])[_0x5b02d0(0x1c7)](_0x5b02d0(0x151)),_0xff153=new Date(_0xdd5f2c[_0x5b02d0(0x1ee)])['toLocaleDateString'](_0x47636d['Xavus']);
      _0x315752[_0x5b02d0(0x248)]=_0x5b02d0(0x182)+_0xdd5f2c['key']+'</div></td>\n                <td>'+(_0xdd5f2c['userName']||_0x47636d[_0x5b02d0(0x2ba)])+_0x5b02d0(0x202)+(_0xdd5f2c[_0x5b02d0(0x330)]||_0x47636d[_0x5b02d0(0x1d7)])+'</td>\n                <td><span class=\"status-badge-small '+_0x48c0a0+'\">'+_0x121b80+_0x5b02d0(0x174)+_0x16b811+_0x5b02d0(0x202)+_0x201234+'</td>\n                <td>'+_0xff153+_0x5b02d0(0x262)+_0xdd5f2c[_0x5b02d0(0x18c)]+_0x5b02d0(0x20e)+_0xdd5f2c[_0x5b02d0(0x18c)]+_0x5b02d0(0x159)+_0xdd5f2c[_0x5b02d0(0x18c)]+_0x5b02d0(0x20b),_0x228f4d[_0x5b02d0(0x2c6)](_0x315752);
    }
    ),_0x5e7f71["length"]===0x0&&(_0x228f4d["innerHTML"]=_0x47636d["hWpXx"]);
    else {
      const _0x47863a=_0x36e50a["target"]["getAttribute"](atVMrZ["kFdMi"]);
      atVMrZ['XBOrs'](_0x1b4032,_0x47863a);
    }
  }
  _0x47636d["gPhoK"](attachTableButtonListeners);
}
function attachTableButtonListeners() {
  const _0x189462=a0_0x5f17,_0x2b690c= {
    'mNNKE':"data-key",'gdmuB':function(_0x3a889f,_0x168cc9) {
      return _0x3a889f(_0x168cc9);
    },
    'gYmJk':'click','wWCaz':function(_0x2ae627,_0x383664) {
      return _0x2ae627===_0x383664;
    },
    'EPgCt':'true','pgCpZ':function(_0x313e3c,_0x11322d,_0x4b4fb8,_0xc59787) {
      return _0x313e3c(_0x11322d,_0x4b4fb8,_0xc59787);
    },
    'uYSVb':function(_0x19991b,_0x21ca7b) {
      return _0x19991b===_0x21ca7b;
    },
    'yGxqh':'FeOjy','xRxwY':"haOxj",'ihRIY':"alert-generate",'OxZlb':function(_0x37b876,_0x4ffce8) {
      return _0x37b876+_0x4ffce8;
    },
    'EadTX':"error",'ZcyfG':function(_0xd6c0d9) {
      return _0xd6c0d9();
    },
    'hnppQ':function(_0xd3cbf8,_0x58cfee) {
      return _0xd3cbf8!==_0x58cfee;
    },
    'PUfhZ':'zoJth','sJxWm':".btn-copy",'vWlWh':".btn-toggle",'XiwmZ':".btn-delete",'MMvnT':".btn-view"
  };
  document['querySelectorAll'](_0x2b690c["sJxWm"])["forEach"](_0x1fdbd5=> {
    const _0x279f97=_0x189462,_0x5761d0= {
      'DMAyY':_0x279f97(0x170),'Yskuo':_0x279f97(0x2a3),'idURw':function(_0x1b3044,_0x4d38af) {
        return _0x1b3044!==_0x4d38af;
      },
      'aXcPd':_0x279f97(0x2d8),'HAdBb':_0x2b690c[_0x279f97(0x1ab)],'Ynwgk':function(_0x30502a,_0x3de9a7) {
        const _0x25098a=_0x279f97;
        return _0x2b690c[_0x25098a(0x272)](_0x30502a,_0x3de9a7);
      }
    };
    _0x1fdbd5[_0x279f97(0x37f)](_0x2b690c['gYmJk'],_0x543546=> {
      const _0xfb5bc9=_0x279f97,_0x1baf0a= {
        'etYQx':_0x5761d0['DMAyY'],'ERcdt':'Cole o JSON das licencas!','ZFrlH':_0x5761d0[_0xfb5bc9(0x178)]
      };
      if(_0x5761d0[_0xfb5bc9(0x362)](_0x5761d0['aXcPd'],_0xfb5bc9(0x2d8))) {
        _0x3d37ee(_0x1baf0a[_0xfb5bc9(0x373)],_0x1baf0a[_0xfb5bc9(0x275)],_0x1baf0a[_0xfb5bc9(0x198)]);
        return;
      } else {
        const _0x22e2a4=_0x543546[_0xfb5bc9(0x2b4)][_0xfb5bc9(0x37c)](_0x5761d0[_0xfb5bc9(0x370)]);
        _0x5761d0[_0xfb5bc9(0x25b)](copyLicense,_0x22e2a4);
      }
    }
    );
  }
  ),document["querySelectorAll"](_0x2b690c["vWlWh"])["forEach"](_0x4048ce=> {
    const _0x1fb274=_0x189462,_0x401313= {
      'HGmWg':_0x2b690c[_0x1fb274(0x1ab)],'ErRyD':function(_0x11ae45,_0x559590) {
        const _0x1c171e=_0x1fb274;
        return _0x2b690c[_0x1c171e(0x27f)](_0x11ae45,_0x559590);
      },
      'xFDvt':_0x1fb274(0x1f5),'IThJA':_0x2b690c['EPgCt'],'CjgNb':function(_0x2fcd78,_0x299b1a,_0x2d7ae2) {
        return _0x2fcd78(_0x299b1a,_0x2d7ae2);
      },
      'ulqss':function(_0x581cdc,_0x10fa17,_0x5c43ee,_0x2794ee) {
        const _0x384f36=_0x1fb274;
        return _0x2b690c[_0x384f36(0x238)](_0x581cdc,_0x10fa17,_0x5c43ee,_0x2794ee);
      },
      'rollO':_0x1fb274(0x155),'Dzjdw':_0x1fb274(0x2a3)
    };
    _0x2b690c[_0x1fb274(0x21d)](_0x2b690c[_0x1fb274(0x2cf)],_0x2b690c['yGxqh'])?_0x4048ce[_0x1fb274(0x37f)](_0x2b690c[_0x1fb274(0x25a)],_0x17631a=> {
      const _0x3bd961=_0x1fb274,_0x5436db=_0x17631a[_0x3bd961(0x2b4)]['getAttribute'](_0x401313[_0x3bd961(0x300)]),_0x32ef63=_0x401313['ErRyD'](_0x17631a['target'][_0x3bd961(0x37c)](_0x401313[_0x3bd961(0x374)]),_0x401313['IThJA']);
      _0x401313[_0x3bd961(0x32e)](toggleLicense,_0x5436db,!_0x32ef63);
    }
    ):_0x401313[_0x1fb274(0x35a)](_0x48c543,_0x1fb274(0x315),_0x401313[_0x1fb274(0x17f)]+_0x3d5027[_0x1fb274(0x31a)],_0x401313[_0x1fb274(0x1ec)]);
  }
  ),document["querySelectorAll"](_0x2b690c["XiwmZ"])["forEach"](_0x149eb0=> {
    const _0x1b3e5a=_0x189462,_0x4b3da2= {
      'IKuXn':function(_0x3a9264,_0x537ed6,_0x5563de,_0x2c24df) {
        const _0x1517d1=a0_0x5f17;
        return _0x2b690c["pgCpZ"](_0x3a9264,_0x537ed6,_0x5563de,_0x2c24df);
      },
      'ObOyk':_0x2b690c[_0x1b3e5a(0x379)],'pjhTx':function(_0x1d861b,_0x3e0fdd) {
        const _0xc69759=_0x1b3e5a;
        return _0x2b690c[_0xc69759(0x2f7)](_0x1d861b,_0x3e0fdd);
      },
      'nymok':_0x2b690c[_0x1b3e5a(0x1fb)],'QIaNz':function(_0x18f9f3) {
        return _0x2b690c['ZcyfG'](_0x18f9f3);
      }
    };
    _0x2b690c[_0x1b3e5a(0x166)](_0x2b690c[_0x1b3e5a(0x18e)],_0x2b690c[_0x1b3e5a(0x18e)])?_0x4b3da2[_0x1b3e5a(0x349)](_0xfad642,_0x4b3da2['ObOyk'],_0x4b3da2[_0x1b3e5a(0x215)](_0x1b3e5a(0x2c0),_0x1c2b55[_0x1b3e5a(0x31a)]),_0x4b3da2[_0x1b3e5a(0x2a6)]):_0x149eb0[_0x1b3e5a(0x37f)](_0x2b690c[_0x1b3e5a(0x25a)],_0x2d4702=> {
      const _0x4ab40d=_0x1b3e5a;
      if(_0x4ab40d(0x273)!==_0x2b690c[_0x4ab40d(0x33e)])_0x4b3da2['QIaNz'](_0x5bc876);
      else {
        const _0x6c49f2=_0x2d4702[_0x4ab40d(0x2b4)][_0x4ab40d(0x37c)](_0x2b690c[_0x4ab40d(0x1ab)]);
        _0x2b690c[_0x4ab40d(0x272)](deleteLicenseConfirm,_0x6c49f2);
      }
    }
    );
  }
  ),document["querySelectorAll"](_0x2b690c["MMvnT"])['forEach'](_0x6f16f4=> {
    const _0x47bf89=_0x189462;
    _0x6f16f4['addEventListener'](_0x2b690c[_0x47bf89(0x25a)],_0x5da653=> {
      const _0x4b1889=_0x47bf89,_0x3cf73e=_0x5da653[_0x4b1889(0x2b4)]['getAttribute'](_0x2b690c[_0x4b1889(0x1ab)]);
      viewLicenseDetails(_0x3cf73e);
    }
    );
  }
  );
}
async function generateNewLicense() {
  const _0x18d15e=a0_0x5f17,_0x440639= {
    'sBfNE':"confirm-modal",'hsFqr':function(_0x71b709,_0x45d3c7) {
      return _0x71b709===_0x45d3c7;
    },
    'ovroS':'xCFAI','KqfOF':"MphCN",'fjTTj':function(_0x21ad7a) {
      return _0x21ad7a();
    },
    'jZQFn':"data-key",'atBMw':function(_0x5ad11f,_0x1b6d20) {
      return _0x5ad11f(_0x1b6d20);
    },
    'CHbWK':"click",'ttWPV':"password-modal",'bGoDJ':"none",'PvZNL':"show",'LFAEx':"user-name",'rXGHi':'expiry-days','FSavp':"max-uses",'ScgYR':"QDBav",'rYTTm':"new-license-key",'kWiNH':"generated-license",'xJQJE':"block",'VQVqv':'user-phone','akrPh':function(_0x48a2f8,_0x5a1ddb,_0x132b85,_0x1233d6) {
      return _0x48a2f8(_0x5a1ddb,_0x132b85,_0x1233d6);
    },
    'HRxwu':function(_0x3752b3,_0x25c15d) {
      return _0x3752b3+_0x25c15d;
    },
    'ETFvU':function(_0x5dc543,_0x5e220b) {
      return _0x5dc543+_0x5e220b;
    },
    'DLNMC':"Licenca gerada com sucesso! Valida por ",'DAZVu':'success','EkOOu':function(_0x3397a7,_0xddb1dc,_0x2a857a) {
      return _0x3397a7(_0xddb1dc,_0x2a857a);
    },
    'mIWXB':"hrwSj",'YnvTQ':function(_0x5bae76,_0x777e24,_0x576ba7,_0x3d5f7a) {
      return _0x5bae76(_0x777e24,_0x576ba7,_0x3d5f7a);
    },
    'rbtNG':function(_0x3a11e7,_0x1b23bb) {
      return _0x3a11e7+_0x1b23bb;
    },
    'qbWbk':"Erro ao gerar licenca: ",'JkeRC':"error"
  },
  _0x3991ac=document['getElementById'](_0x440639["LFAEx"])?.["value"]["trim"]()||'',_0x401055=document["getElementById"]("user-phone")?.["value"]["trim"]()||'',_0x721db1=parseInt(document["getElementById"](_0x440639["rXGHi"])?.['value'])||0x1e,_0x4cc399=document["getElementById"](_0x440639["FSavp"])?.['value']?_0x440639["atBMw"](parseInt,document["getElementById"](_0x440639['FSavp'])["value"]):null;
  try {
    if(_0x440639["hsFqr"](_0x440639["ScgYR"],_0x440639["ScgYR"])) {
      const _0x377b31=await licenseManager["generateLicense"](_0x721db1,_0x4cc399,_0x3991ac,_0x401055),_0x5635f7=document["getElementById"](_0x440639["rYTTm"]);
      if(_0x5635f7)_0x5635f7["textContent"]=_0x377b31["key"];
      const _0x4d3dbe=document['getElementById'](_0x440639['kWiNH']);
      if(_0x4d3dbe)_0x4d3dbe["style"]["display"]=_0x440639["xJQJE"];
      const _0x3df248=document['getElementById']("user-name");
      if(_0x3df248)_0x3df248["value"]='';
      const _0x48f674=document['getElementById'](_0x440639["VQVqv"]);
      if(_0x48f674)_0x48f674["value"]='';
      const _0x1379f4=document["getElementById"]("expiry-days");
      if(_0x1379f4)_0x1379f4["value"]='30';
      const _0x20212e=document["getElementById"](_0x440639["FSavp"]);
      if(_0x20212e)_0x20212e["value"]='';
      _0x440639['akrPh'](showAlert,"alert-generate",_0x440639["HRxwu"](_0x440639["ETFvU"](_0x440639["DLNMC"],_0x721db1)," dias."),_0x440639["DAZVu"]),_0x440639['EkOOu'](setTimeout,()=> {
        const _0x276b8f=_0x18d15e;
        if(_0x440639['hsFqr'](_0x440639['ovroS'],_0x440639[_0x276b8f(0x33a)])) {
          const _0x54c8f5=_0x2e1654['getElementById'](_0x276b8f(0x2bb));
          if(_0x54c8f5)_0x54c8f5[_0x276b8f(0x298)]=_0x458935;
          const _0x5132bc=_0x46f631[_0x276b8f(0x184)]('modal-message');
          if(_0x5132bc)_0x5132bc[_0x276b8f(0x298)]=_0x40c3e9;
          const _0x2a2d73=_0x584f05[_0x276b8f(0x184)](_0x440639[_0x276b8f(0x2c3)]);
          if(_0x2a2d73)_0x2a2d73[_0x276b8f(0x216)][_0x276b8f(0x21e)](_0x276b8f(0x1ea));
        } else _0x440639[_0x276b8f(0x2b9)](loadDashboard);
      },
      0x1f4);
    } else _0x37a561["addEventListener"](OiacSE['CHbWK'],_0x1b0ab5=> {
      const _0x44b39d=_0x18d15e,_0x565c3d=_0x1b0ab5[_0x44b39d(0x2b4)]['getAttribute'](OiacSE[_0x44b39d(0x28f)]);
      OiacSE[_0x44b39d(0x1b8)](_0x42de7d,_0x565c3d);
    }
    );
  } catch(_0x44c0b9) {
    if(_0x440639["mIWXB"]!==_0x440639['mIWXB']) {
      const _0x211632=_0x4038e0["getElementById"](OiacSE["ttWPV"]);
      _0x211632&&(_0x211632["style"]['display']=OiacSE["bGoDJ"],_0x211632["classList"]['remove'](OiacSE["PvZNL"]));
    } else _0x440639["YnvTQ"](showAlert,"alert-generate",_0x440639["rbtNG"](_0x440639["qbWbk"],_0x44c0b9["message"]),_0x440639["JkeRC"]);
  }
}
function copyLicense(_0xaad265) {
  const _0x3c4f66=a0_0x5f17,_0x42a8a5= {
    'mAIcg':function(_0x5d2e29,_0x33f6d1,_0x4fc113,_0x1324f8) {
      return _0x5d2e29(_0x33f6d1,_0x4fc113,_0x1324f8);
    },
    'KNPtJ':"alert-generate",'hiZax':function(_0x4c5578,_0x200cb8) {
      return _0x4c5578+_0x200cb8;
    },
    'fwFRt':"Erro ao copiar: ",'jWtHa':"error"
  };
  navigator['clipboard']["writeText"](_0xaad265)["then"](()=> {
    const _0xaaffca=_0x3c4f66;
    _0x42a8a5['mAIcg'](showAlert,_0x42a8a5[_0xaaffca(0x2d0)],'Licenca copiada para a area de transferencia!',_0xaaffca(0x33f));
  }
  )["catch"](_0x2ca3c6=> {
    const _0x45a40a=_0x3c4f66;
    _0x42a8a5[_0x45a40a(0x291)](showAlert,_0x42a8a5['KNPtJ'],_0x42a8a5[_0x45a40a(0x23c)](_0x42a8a5[_0x45a40a(0x355)],_0x2ca3c6[_0x45a40a(0x31a)]),_0x42a8a5[_0x45a40a(0x2a8)]);
  }
  );
}
function copyToClipboard() {
  const _0x73633a=a0_0x5f17,_0x41245c= {
    'uzeDL':"none",'DHPgf':"show",'AlWQK':'ahNwP','glIqW':function(_0x85a25d,_0x2976d7,_0x4a5f46,_0x511770) {
      return _0x85a25d(_0x2976d7,_0x4a5f46,_0x511770);
    },
    'RTcCI':'success','UIrik':"Erro ao testar Firebase:",'SokBo':"rgba(200, 100, 100, 0.2)",'GudPw':"❌ Erro: ",'XfmKZ':function(_0x5055fd,_0x3f77d8) {
      return _0x5055fd===_0x3f77d8;
    },
    'TxxbQ':"RFgtE",'qfIfi':'alert-generate','UPjsY':function(_0x32a399,_0xfbe9e9) {
      return _0x32a399+_0xfbe9e9;
    },
    'ysmTt':"Erro ao copiar: ",'DJQaX':"error",'qkSrQ':"new-license-key",'dZgic':"Gere uma licenca primeiro!"
  },
  _0x330c43=document["getElementById"](_0x41245c["qkSrQ"]),_0x37381c=_0x330c43?_0x330c43["textContent"]:'';
  if(!_0x37381c) {
    showAlert(_0x41245c['qfIfi'],_0x41245c["dZgic"],'error');
    return;
  }
  navigator["clipboard"]["writeText"](_0x37381c)["then"](()=> {
    const _0x3f2a62=_0x73633a;
    _0x41245c[_0x3f2a62(0x259)]!==_0x41245c[_0x3f2a62(0x259)]?(_0x5a89ee[_0x3f2a62(0x224)]['display']=rwfxUH[_0x3f2a62(0x2fc)],_0x15bfb7[_0x3f2a62(0x216)][_0x3f2a62(0x2dd)](rwfxUH[_0x3f2a62(0x153)])):_0x41245c[_0x3f2a62(0x197)](showAlert,'alert-generate','Licenca copiada para a area de transferencia!',_0x41245c[_0x3f2a62(0x2ec)]);
  }
  )["catch"](_0x217854=> {
    const _0xcb5602=_0x73633a,_0x25abeb= {
      'qLgVU':_0x41245c[_0xcb5602(0x2a0)],'tqsDu':_0x41245c['SokBo'],'pNiix':function(_0x138f85,_0x438cdf) {
        return _0x138f85+_0x438cdf;
      },
      'oPCcc':_0x41245c[_0xcb5602(0x360)]
    };
    _0x41245c['XfmKZ'](_0x41245c[_0xcb5602(0x236)],_0xcb5602(0x1aa))?(_0x23bd93[_0xcb5602(0x2a3)](_0x25abeb[_0xcb5602(0x295)],_0x1b8801),_0x277ddd&&(_0x546bf9['style'][_0xcb5602(0x2b0)]=_0x25abeb[_0xcb5602(0x317)],_0x454e04[_0xcb5602(0x298)]=_0x25abeb[_0xcb5602(0x1b6)](_0x25abeb['oPCcc'],_0x19c9cf[_0xcb5602(0x31a)]))):showAlert(_0x41245c[_0xcb5602(0x18f)],_0x41245c[_0xcb5602(0x269)](_0x41245c[_0xcb5602(0x1b0)],_0x217854[_0xcb5602(0x31a)]),_0x41245c[_0xcb5602(0x22a)]);
  }
  );
}
async function toggleLicense(_0x21b97e,_0x3557fb) {
  const _0x5566c5=a0_0x5f17,_0x4b3ebd= {
    'PflbX':"[Admin] Senha correta!",'QGXPQ':function(_0x18da2e) {
      return _0x18da2e();
    },
    'LUBHt':function(_0x39a6d9) {
      return _0x39a6d9();
    },
    'PKdxA':function(_0x3e76b2,_0xda68cb) {
      return _0x3e76b2+_0xda68cb;
    },
    'pquOk':function(_0x479ec7,_0xa38b97) {
      return _0x479ec7===_0xa38b97;
    },
    'JYsWj':"RorUs",'XTEGI':function(_0x5b7696,_0x47e8c5,_0x58f70e,_0x3eb7f9) {
      return _0x5b7696(_0x47e8c5,_0x58f70e,_0x3eb7f9);
    },
    'adirk':"alert-generate",'HXcAz':"Licenca reativada!",'GRvsv':function(_0x5476d1,_0xb71ff2,_0x45495b,_0xb3f40c) {
      return _0x5476d1(_0xb71ff2,_0x45495b,_0xb3f40c);
    },
    'GpSVA':'success','RfBmW':'EJtBF','FjMdx':"error"
  };
  try {
    if(_0x4b3ebd["pquOk"]("RorUs",_0x4b3ebd["JYsWj"]))_0x3557fb?(await licenseManager['reactivateLicense'](_0x21b97e),_0x4b3ebd["XTEGI"](showAlert,_0x4b3ebd["adirk"],_0x4b3ebd["HXcAz"],"success")):(await licenseManager['deactivateLicense'](_0x21b97e),_0x4b3ebd["GRvsv"](showAlert,_0x4b3ebd["adirk"],'Licenca desativada!',_0x4b3ebd['GpSVA'])),_0x4b3ebd["LUBHt"](loadDashboard);
    else {
      const _0xeb30b5='1|0|2|4|3'["split"]('|');
      let _0x53edd1=0x0;
      while(true) {
        switch(_0xeb30b5[_0x53edd1++]) {
          case'0':_0x5b73bf=true;
          continue;
          case'1':_0xfbd541["log"](whXdRN["PflbX"]);
          continue;
          case'2':whXdRN['QGXPQ'](_0x1b7719);
          continue;
          case'3':whXdRN['LUBHt'](_0x55e6e2);
          continue;
          case'4':if(_0x13ff2f)_0x1932f6["value"]='';
          continue;
        }
        break;
      }
    }
  } catch(_0x4b346a) {
    "EJtBF"===_0x4b3ebd["RfBmW"]?_0x4b3ebd["XTEGI"](showAlert,"alert-generate",_0x4b3ebd["PKdxA"]("Erro: ",_0x4b346a["message"]),_0x4b3ebd["FjMdx"]):(_0x52fa8d["style"]['background']="rgba(200, 100, 100, 0.2)",_0x4e5f75["textContent"]=_0x4b3ebd["PKdxA"]('❌ ',_0x1adbb1["message"]));
  }
}
async function viewLicenseDetails(_0x1f580d) {
  const _0x92136e=a0_0x5f17,_0x2e773b= {
    'lMtwZ':function(_0x5b75ad,_0x29f75e,_0x1022af,_0x39a57d) {
      return _0x5b75ad(_0x29f75e,_0x1022af,_0x39a57d);
    },
    'OQtjb':"Licenca nao encontrada",'ODrOj':"error",'TeZGu':function(_0x519b16,_0x343567) {
      return _0x519b16===_0x343567;
    },
    'hDJMt':"rHRff",'TzIRX':function(_0x1cabc9,_0x39d220,_0x149dee,_0x3830a4) {
      return _0x1cabc9(_0x39d220,_0x149dee,_0x3830a4);
    },
    'kFcQj':function(_0xf13777,_0x4a48f6) {
      return _0xf13777>_0x4a48f6;
    },
    'IZYFf':function(_0x4961fe,_0x1f6f81) {
      return _0x4961fe+_0x1f6f81;
    },
    'vXuZr':function(_0x46e6b3,_0x4fe7ff) {
      return _0x46e6b3+_0x4fe7ff;
    },
    'EMNDF':function(_0x47fd37,_0x5c4cfc) {
      return _0x47fd37+_0x5c4cfc;
    },
    'DVOTN':function(_0x2da2b5,_0x5908c0) {
      return _0x2da2b5+_0x5908c0;
    },
    'dXNeM':function(_0x5e953f,_0x5ebdc1) {
      return _0x5e953f+_0x5ebdc1;
    },
    'aCRKC':function(_0x6441a8,_0x269b2d) {
      return _0x6441a8+_0x269b2d;
    },
    'RjjPT':function(_0x2e49e7,_0x773ba5) {
      return _0x2e49e7+_0x773ba5;
    },
    'cEXuQ':function(_0x5e5584,_0x482551) {
      return _0x5e5584+_0x482551;
    },
    'dgPJo':function(_0x3c4b9b,_0xd19f51) {
      return _0x3c4b9b+_0xd19f51;
    },
    'jhIGJ':'Detalhes da Licenca\n\nChave: ','OVPPK':"Sem nome",'NBEPH':'Sem telefone','QKbHf':"\nCriada: ",'GgUtg':"pt-BR",'awKnZ':"\nExpira: ",'PbIDm':'\nStatus: ','QNKpD':"Ativa",'rfDim':"Inativa",'vIUhs':"\nDispositivos: ",'eYszd':"\nUsos: ",'gkefv':function(_0x196a12,_0x43f090) {
      return _0x196a12+_0x43f090;
    },
    'kMolj':' / ','ZNNSZ':" (ilimitado)",'yeRFU':'alert-generate','tNKgv':"Erro: "
  };
  try {
    if(_0x2e773b["TeZGu"](_0x2e773b["hDJMt"],_0x2e773b['hDJMt'])) {
      const _0x5d82f1=await licenseManager["getLicenseInfo"](_0x1f580d);
      if(!_0x5d82f1) {
        _0x2e773b["TzIRX"](showAlert,"alert-generate",_0x2e773b['OQtjb'],_0x2e773b['ODrOj']);
        return;
      }
      const _0x253b17=_0x5d82f1["activatedDevices"]&&_0x2e773b["kFcQj"](_0x5d82f1['activatedDevices']["length"],0x0)?_0x5d82f1['activatedDevices']["join"](', '):"Nenhum dispositivo",_0x55410d=_0x2e773b["IZYFf"](_0x2e773b["IZYFf"](_0x2e773b["vXuZr"](_0x2e773b['EMNDF'](_0x2e773b["DVOTN"](_0x2e773b["dXNeM"](_0x2e773b['aCRKC'](_0x2e773b['dXNeM'](_0x2e773b["RjjPT"](_0x2e773b["cEXuQ"](_0x2e773b["cEXuQ"](_0x2e773b["DVOTN"](_0x2e773b["dgPJo"](_0x2e773b["DVOTN"](_0x2e773b['jhIGJ']+_0x5d82f1["key"],"\nNome: ")+(_0x5d82f1["userName"]||_0x2e773b['OVPPK']),"\nTelefone: "),_0x5d82f1["userPhone"]||_0x2e773b['NBEPH']),_0x2e773b['QKbHf']),new Date(_0x5d82f1["created"])["toLocaleDateString"](_0x2e773b['GgUtg'])),_0x2e773b["awKnZ"]),new Date(_0x5d82f1["expiryDate"])["toLocaleDateString"](_0x2e773b["GgUtg"])),_0x2e773b["PbIDm"]),_0x5d82f1['active']?_0x2e773b["QNKpD"]:_0x2e773b["rfDim"]),_0x2e773b["vIUhs"]),_0x253b17),_0x2e773b["eYszd"]),_0x5d82f1['uses']),_0x5d82f1["maxUses"]?_0x2e773b["gkefv"](_0x2e773b['kMolj'],_0x5d82f1["maxUses"]):_0x2e773b["ZNNSZ"]);
      alert(_0x55410d);
    } else {
      _0x2e773b['lMtwZ'](_0x7b2fe4,"alert-generate",_0x2e773b["OQtjb"],_0x2e773b["ODrOj"]);
      return;
    }
  } catch(_0x59e41f) {
    _0x2e773b["TzIRX"](showAlert,_0x2e773b["yeRFU"],_0x2e773b["RjjPT"](_0x2e773b["tNKgv"],_0x59e41f["message"]),"error");
  }
}
function deleteLicenseConfirm(_0x39a38a) {
  const _0x131b12=a0_0x5f17,_0x198aec= {
    'ecZWM':function(_0xa53c13,_0x57f8ef,_0x3ff7cb,_0x105a2a) {
      return _0xa53c13(_0x57f8ef,_0x3ff7cb,_0x105a2a);
    },
    'MKLZf':"alert-generate",'EwAzG':"Licenca copiada para a area de transferencia!",'bxrEq':"success",'KoePX':function(_0x1b7285,_0x286d01) {
      return _0x1b7285===_0x286d01;
    },
    'wZpOo':"VIERw",'toXAM':function(_0x2de1b9,_0x4d93c6,_0x2fd840,_0xbee0ad) {
      return _0x2de1b9(_0x4d93c6,_0x2fd840,_0xbee0ad);
    },
    'DAsEJ':"Licenca deletada!",'lSouY':function(_0x5aeafa) {
      return _0x5aeafa();
    },
    'VwcZC':function(_0x302ab9,_0x3f5d00,_0xfabcba,_0x221c8d) {
      return _0x302ab9(_0x3f5d00,_0xfabcba,_0x221c8d);
    },
    'OSiHH':function(_0x48968e,_0x5d1075) {
      return _0x48968e+_0x5d1075;
    },
    'xnRUg':'Erro: ','OmshO':'error','iyMts':function(_0x5bc38e,_0x40ca1a,_0x158bda) {
      return _0x5bc38e(_0x40ca1a,_0x158bda);
    },
    'SHlBW':"Deletar Licenca",'gMnRr':"Tem certeza que deseja deletar esta licenca? Esta acao nao pode ser desfeita."
  };
  currentAction=async()=> {
    const _0x35a693=_0x131b12;
    try {
      _0x198aec[_0x35a693(0x265)](_0x35a693(0x2c7),_0x198aec[_0x35a693(0x183)])?JcZCsZ[_0x35a693(0x252)](_0x290524,JcZCsZ[_0x35a693(0x29e)],JcZCsZ[_0x35a693(0x343)],JcZCsZ[_0x35a693(0x15f)]):(await licenseManager[_0x35a693(0x190)](_0x39a38a),_0x198aec['toXAM'](showAlert,_0x35a693(0x315),_0x198aec[_0x35a693(0x1cd)],_0x35a693(0x33f)),loadDashboard(),_0x198aec[_0x35a693(0x1df)](loadManageLicenses),_0x198aec['lSouY'](closeModal));
    } catch(_0x2a3890) {
      _0x198aec[_0x35a693(0x361)](showAlert,_0x198aec[_0x35a693(0x29e)],_0x198aec[_0x35a693(0x267)](_0x198aec['xnRUg'],_0x2a3890['message']),_0x198aec[_0x35a693(0x18d)]);
    }
  },
  _0x198aec["iyMts"](showModal,_0x198aec["SHlBW"],_0x198aec["gMnRr"]);
}
async function exportLicenses() {
  const _0x28b4d7=a0_0x5f17,_0x34f5e6= {
    'GipAe':"[Admin] Erro ao definir senha:",'CndFi':function(_0x361a2b,_0x142701,_0x4bced5,_0x2ca8e3) {
      return _0x361a2b(_0x142701,_0x4bced5,_0x2ca8e3);
    },
    'nPNpR':function(_0x4f1559,_0x1e4627) {
      return _0x4f1559+_0x1e4627;
    },
    'HmKKK':'Erro: ','tQqYM':'error','wxoZM':function(_0x53bc3b,_0x3cf897) {
      return _0x53bc3b===_0x3cf897;
    },
    'anbxU':'lxZnj','vxhIE':"export-textarea",'hPiyR':function(_0x42f8f1,_0x3503bd,_0x56c3c1,_0x326ac8) {
      return _0x42f8f1(_0x3503bd,_0x56c3c1,_0x326ac8);
    },
    'ltEZn':"Licencas exportadas com sucesso!",'QjNrp':"success",'Akkpt':function(_0x5bb1f3,_0x1dc15f,_0x36627c,_0x8e6eb8) {
      return _0x5bb1f3(_0x1dc15f,_0x36627c,_0x8e6eb8);
    },
    'krEOt':'alert-settings','IJnFI':function(_0x11ce26,_0x1b9391) {
      return _0x11ce26+_0x1b9391;
    }
  };
  try {
    if(_0x34f5e6["wxoZM"](_0x34f5e6["anbxU"],"lxZnj")) {
      const _0x3093d0=await licenseManager['exportLicenses'](),_0x145bb2=document["getElementById"](_0x34f5e6["vxhIE"]);
      if(_0x145bb2)_0x145bb2["value"]=_0x3093d0;
      _0x34f5e6["hPiyR"](showAlert,"alert-settings",_0x34f5e6["ltEZn"],_0x34f5e6["QjNrp"]);
    } else _0xafe29["error"](_0x34f5e6['GipAe'],_0x148ff4),_0x34f5e6['CndFi'](_0x4afba6,"alert-settings",_0x34f5e6["nPNpR"](_0x34f5e6["HmKKK"],_0x16bb1f["message"]),_0x34f5e6["tQqYM"]);
  } catch(_0x303ef2) {
    _0x34f5e6["Akkpt"](showAlert,_0x34f5e6["krEOt"],_0x34f5e6["IJnFI"](_0x34f5e6['HmKKK'],_0x303ef2["message"]),_0x34f5e6["tQqYM"]);
  }
}
function a0_0x463c() {
  const _0x5d1e70=['cKrPC3bVC2L0AxzVCZOG','pc9KAxy+cIaGicaGicaGicaGicaGica8zgL2ignSyxnZpsjZDgf0lwXHyMvSiJ5uB3rHBcbKzsbmAwnLBMnHCZWVzgL2pGOGicaGicaGicaGica8l2rPDJ4kicaGicaGicaGicaGpgrPDIbJBgfZCZ0IC3rHDc1JyxjKiJ4kicaGicaGicaGicaGicaGidXKAxyGy2XHC3m9iNn0yxqTBNvTyMvYiJ4','DMfSDwu','CKzbC3G','DLvoDuy','Bu5os0u','iIbKyxrHlwfJDgL2zt0I','vhPjuLG','Cgfnsfm','AM9PBG','ExnTvhq','BhPyA0m','seDUAvC','zxHWB3j0lxrLEhrHCMvH','CMPqC1G','tezbrxG','Ce5PAxG','su9HAgO','yxrctxC','yxzHAwXHyMXL','CNLOq0S','Bg9N','z1bOB0S','Dhrgtw4','BNP2wuG','wuLgDKm','BwfUywDL','zMLYzwjHC2uTC3rHDhvZ','z2TLzNy','sLj4uhO','whLjs3i','y3jLyxrLza','Aw5PDa','Dg9mB2nHBgveyxrLu3rYAw5N','y2XPy2S','tfvcshq','reTqsK0','zgf0ys1RzxK','u2nNwvi','refZruO','uM1eCeS','rxHtsLO','yKDVreO','v2vPBui','tfPpuLO','qwTRChq','DhjPBq','t2ndD0W','AgfxA3y','tLvhC2O','yMXVy2S','tgLJzw5JysbYzwf0AxzHzgeH','BgvUz3rO','u2LT','z2vzEgS','sfbVyKK','txbOq04','BfnVDvK','zgDlswm','uM9Yvxm','vg9KyxmGyxmGBgLJzw5JyxmGzM9Yyw0GzgvSzxrHzgfZiq','nZa0nZmYC0XgC1fH','cLvZB3m6ia','vxnUCMm','wNrfv04','q0f1D0G','wKXtvMG','yNrUlwLTCg9YDa','C2HVDW','tu12BLq','rhPQzhC','w0fKBwLUxsbfCNjVigfVigrLzMLUAxiGC2vUAge6','zxHWAxj5rgf0zq','zfHozu0','BKTzDvK','Bw9KywWTy2XVC2u','yxjLreG','qsbZzw5OysbKzxzLihrLCIbUBYbTAw5PBw8GnIbJyxjHy3rLCMvZiq','4O+ZifrLC3rHBMrVignVBMv4W6nVlI4U','zgf0ys1Hy3rPDMu','r2HpzxK','yNrUlwv4Cg9YDa','B25RzxLWCMvZCW','rgLNAxrLigeGC2vUAgeH','sgT2Au8','rwfKvfG','wvvWyKG','DuLiC1u','B2PWuwu','ELLut3O','ywn0AxzHDgvK','AMnrD2S','pc90zd4kicaGicaGicaGicaGicaGidX0zd4','rhnOALi','uKjPAey','CMDIysGXmdaSidiWmcWGmtaWlcaWlJiP','yxPsvKK','uwrMBLq','nwjIrwDKAq','EMjPrw4','CLHhsgK','iJ5ezwXLDgfYpc9IDxr0B24+cIaGicaGicaGicaGicaGicaGicaGpc9KAxy+cIaGicaGicaGicaGicaGica8l3rKpGOGicaGicaGicaGica','ENHIzwK','rfzpve4','iJ5dB3bPyxi8l2j1DhrVBJ4kicaGicaGicaGicaGicaGicaGicaGicaGpgj1DhrVBIbJBgfZCZ0Iywn0Aw9Ulwj0BI1ZBwfSBcbIDg4TDMLLDYiGzgf0ys1RzxK9iG','C2zZq1m','rg1fq0e','twHRCNu','ywn0AxzHDgvKrgv2AwnLCW','mtKWnJjcC3DWALy','tKj3wM4','CgPOvhG','y2XHC3nmAxn0','CKHszMy','vwTTDhu','y0P3Dem','AwXgr2y','C2v0qwrTAw5qyxnZD29Yza','sgDlyvK','DvLtvMi','ywrK','C0LWs04','B25JBgLJAW','rxjYBYbHBYbJB3bPyxi6ia','zgfZAgjVyxjK','rgLNAxrLihvTysbZzw5Oyse','C3r5Bgu','u2vTig5VBwu','ww1fsNm','rxHWB3j0zsbHCYbSAwnLBMnHCYbWCMLTzwLYBYe','CxvLCNLtzwXLy3rVCG','wM9cA1u','rePryvG','swP1tNq','r2zMC1O','BNnTwNu','cK5VBwu6ia','De5lz3y','C0P5D2G','DgHLBG','ww52vfe','qNzetLe','uKruAhe','twDABxy','vhH4yLe','icHPBgLTAxrHzg8P','CgDdCfO','rgn5D2y','lNrHyI1JB250zw50','CMj0tKC','AgLAyxG','BKnovu4','suPUrKK','r1j2C3y','BuLxwei','yw5IEfu','refAvNu','DxflA0i','u2vTihrLBgvMB25L','t1f0AMi','qMzvr1y','ywn0AxzL','Aw5Uzxjive1m','tMfV','ALzyrMS','EhDztwm','B1nHvxq','uurcyxy','odCWzfnJvgrZ','DePStfO','u0fNvKW','4O+ZifnPBMnYB25PEMfUzg8UlI4','zwnAv00','vLnYu3e','z2v0qwXStgLJzw5Zzxm','u2vUAgeGAw5JB3jYzxrHiq','yNrUlwnHBMnLBa','y2XPCgjVyxjK','txPht3u','qwXxuuS','z1LTsMS','ww53z2S','svPzrMy','yvL6zfa','phrYpJX0zcbJB2XZCgfUpsi4iIbZDhLSzt0IDgv4Dc1HBgLNBJOGy2vUDgvYoYbJB2XVCJOGDMfYkc0TDgv4Dc1ZzwnVBMrHCNKPoYi+tMvUAhvTysbSAwnLBMnHignYAwfKysbHAw5KytWVDgq+pc90CJ4','BefxEK8','yNrUlxn5BMmTzMLYzwjHC2u','rKzzEhC','pc90zd4kicaGicaGicaGicaGicaGidX0zd4kicaGicaGicaGicaGicaGicaGica8zgL2ignSyxnZpsjHy3rPB24TyNv0Dg9UCYi+cIaGicaGicaGicaGicaGicaGicaGicaGidXIDxr0B24Gy2XHC3m9iMfJDgLVBI1IDg4TC21HBgWGyNrUlwnVChKIigrHDgeTA2v5psi','vgvTignLCNrLEMeGCxvLigrLC2vQysbKzwXLDgfYifrpreftigfZigXPy2vUy2fZpYbfC3rHigfJyw8GBMfVihbVzguGC2vYigrLC2zLAxrHiq','C3bSAxq','s29LufG','rMPnzhG','t1nPseG','uLbIB1K','vvbQC1K','sNvWsei','reLKAe0','zfPNAwm','BMv3lwXPy2vUC2uTA2v5','DhvQve4','lMj0BI10B2DNBgu','u2DAv0W','twTQr3u','z2rTDui','AgfpEgO','r2DvDgC','rvjJzhq','D2PAA3G','q1DfwKO','vK9pA0G','CMzeAw0','yNrUlxnLDc1WyxnZD29Yza','swrhAwq','A3jft3q','mZG3mdm2mvvQzg1kyq','sxfswfC','D1DdyxO','uMzcBvC','zePiCLO','Aw1WB3j0lxrLEhrHCMvH','uM5xtuW','CLLuvg0','y0X3EMW','ufDOtKi','CgfZC3DVCMqTBw9KywW','CNHeq0e','wM9vAg4','yNrUlwnSzwfYlwfSBa','EeDmDLi','lMj0BI1KzwXLDgu','DffXwu0','ywrPCMS','ALPrrM4','DwrlAvy','Bufjy2C','zMrZswO','sfj4D3u','D3HVwK0','CuXNvLu','A0zKtwK','zxHWAxj5lwrHExm','Dgv4DenVBNrLBNq','uKzNDeu','u3nysMG','Dg90ywW','D1fhrgK','lMj0BI12Awv3','tuTmwMy','w2rHDgeTDgfIpsi','vuLYAwS','EMTjrKS','CMnSDKC','zxjYB3i','r3PUtLC','Chf1t2S','BNLTB2S','ugjjrg0','ALD0sge','vgvAr3u','zM9JDxm','wgvqsNa','z01UuNi','tgLHuKS','CNvOCe4','AxLnDhm','yMfJA2DYB3vUza','Exbxzwy','tMvUAhvTigrPC3bVC2L0AxzV','y0vyDve','DgfYz2v0','DxnLCK5HBwu','DLH1wNi','u01ksvy','mtGXotLmtw5QAuu','zMPuvgO','CgTuuNG','Bw9KywWTDgL0Bgu','BhrZu2G','uwPoCNa','vur2DM0','BKrQreK','rxjYBZOG','BgLJzw5ZzxmTDgjVzhK','z3LtBw0','C0jMtKu','v0zZDKG','CNvluu4','yxbWzw5Kq2HPBgq','v1f5BgK','w0fKBwLUxsbtzw5OysbJB3jYzxrHiq','vgvTignLCNrLEMeGCxvLigrLC2vQysbKzwXLDgfYigvZDgeGBgLJzw5Jyt8Grxn0ysbHy2fVig5HBYbWB2rLihnLCIbKzxnMzwL0ys4','ywXLCNqGC2HVDYbHBgvYDc0','CeLkA2m','weLUEeK','rM9pBeS','veDKwKO','EuD4CwG','s05qDeO','whLsCwm','rvrgDLu','y2v4C08','DxnLCI1Uyw1L','sLnptIbJB3bPywrVihbHCMeGysbHCMvHigrLihrYyw5ZzMvYzw5JAweH','whD5zM8','zgDqsM8','y1zWz1m','r3LrA08','w0fKBwLUxsbfCNjVigfVihzLCMLMAwnHCIbZzw5OytO','C3PVB0K','vK9Puwq','CMvTB3zL','cKv4CgLYytOG','CMDIysGYmdaSideWmcWGmtaWlcaWlJiP','w0fKBwLUxsbszxn1BhrHzg86','rfD5A04','uMPQufq','CMHSCMK','teXHz1a','DNrNwwK','sKXQCxC','ruP0qKy','igrPyxmU','C1vyBha','y1LJsxm','BhHABMO','uLrJq0K','ANbYy2O','D3zICe8','z2vUzxjHDgvmAwnLBNnL','Bgr5y1C','tMLPA0m','y2XHC3noyw1L','sfHJqxO','mtuYA1zkrgjA','iJ5dB3bPyxi8l2j1DhrVBJ4kicaGicaGicaGicaGicaGicaGicaGicaGpgj1DhrVBIbJBgfZCZ0Iywn0Aw9Ulwj0BI1ZBwfSBcbIDg4TDg9Nz2XLiIbKyxrHlwTLEt0I','tgLlqNy','t3HABgi','zM9YrwfJAa','ENrvCLy','sLLZv2O','z2vUzxjHDgvKlwXPy2vUC2u','DxPLreW','cIaGicaGicaGicaGicaGicaGicaGicaGidWVyNv0Dg9UpGOGicaGicaGicaGicaGicaGicaGicaGica8yNv0Dg9UignSyxnZpsjHy3rPB24TyNrUlxnTywXSigrLBgv0zsbIDg4TzgvSzxrLiIbKyxrHlwTLEt0I','cIaGicaGicaGicaGidXKAxyGy2XHC3m9iNn0yxqTy2fYzci+cIaGicaGicaGicaGicaGica8zgL2ignSyxnZpsjZDgf0lw51BwjLCIi+','rgvZyxrPDMfY','seDTv2C','qwvTs1i','tgLTCgfYifrVzgfZigfZieXPy2vUy2fZ','EK53AMu','ugrfy1q','Ce5yrg0','ywnJzxnZlxbHC3n3B3jK','sMTLuKm','C2fbq0G','uhzAtKW','yw1vr2C','BhrfwM4','w0fKBwLUxsbtzw5OysbKzsbHzg1PBIbLBMnVBNrYywrHlcbWzwrPBMrVihzLCMLMAwnHy2fV','r2vYzsb1BweGBgLJzw5JysbWCMLTzwLYBYe','vw9hu1m','mKLTrKzbqq','u0Xhqvy','ru9nA2q','zxHWAxjLza','qvDjwNC','rxjYBYbHBYb2zxjPzMLJyxiGC2vUAge6ia','ywXLCNqTz2vUzxjHDgu','Ahj3u2O','DhfZrhu','v09VsvK','iJ4kicaGicaGicaGicaGicaGicaGicaGicaGicaGia','BwvZC2fNzq','DxnLCI1WAg9Uzq','EePrsKu','C0P4v20','C2Trzvm','lMj0BI1JB3b5','z2v0tgLJzw5ZzuLUzM8','wgL3BvO','rg5mreq','ugzSyLG','Afvyse8','A0XQt3K','wfrfr0K','cKnYAwfKytOG','AeH0u3K','EwvsrLu','rKvgv2S','q3bztNm','t2npquO','uvnZAvK','q2PNtMi','AhngCxi','DxnLCLbOB25L','zvLZEMq','z0rQzvG','tNnMBei','mJaWota5nhzMD21Mtq','Aerktxq','y29UzMLYBs1TB2rHBa','sfLRyMu','mZi4oti5CvDRzKjR','yNrUlwnSB3nLlxbHBMvS','s3fMt0y','zgLZCgXHEq','4P2miezPCMvIyxnLig7dO28Gy2fYCMvNywrV','Dw5KzwzPBMvK','Efj4D1K','C3vJy2vZCW','thH3rKy','A2jquxq','BLboCfi','rxDbEKC','y2f0y2G','DuvtEhe','v05jDKm','Bwf4lxvZzxm','u0PtuMq','suT1wg4','Bw9KywWTBwvZC2fNzq','A3bUAeG','rw50zxi','sg1ls0S','vLvzquC','rxjYBYbHBYb0zxn0yxiGrMLYzwjHC2u6','mtiXotK2r0nYyvr4','vvjWBfe','vKzKuxC','rLnHDNa','tgLJzw5JysbNzxjHzgeGy29Tihn1y2vZC28HifzHBgLKysbWB3iG','zNDguNq','AfDWwhG','zvv4uMG','CfnWuM0','DKLzBKK','DwXXC3m','zMfdAhi','A1LuqMK','uu5lCeq','rMLYzwjHC2uGBSoJBYbJyxjYzwDHzg8','pc9KAxy+cIaGicaGicaGicaGicaGica8zgL2ignSyxnZpsjZDgf0lwXHyMvSiJ5bDgL2yxm8l2rPDJ4kicaGicaGicaGicaGpc9KAxy+cIaGicaGicaGicaGidXKAxyGy2XHC3m9iNn0yxqTy2fYzci+cIaGicaGicaGicaGicaGica8zgL2ignSyxnZpsjZDgf0lw51BwjLCIi+','r3vKuhC','vNDJwKm','AwrvuNC','s01bz3O','swLeuuG','DNHOsuu','wNvruuG','BNnmBLq','reXotum','vxPoqwG','uersv2W','CwTtCLe','CvzxyNm','Exf5wee','qLDdzNa','wevtvhC','sefKqMi','C3rHDhvZlwLUywn0AxzL','DKLvAhm','zxrzuxG','EezeDNq','sw5HDgL2yq','vujnAM4','yxDTBeK','B2juuue','AwHssvK','yNrUlwnVBMzPCM0','B2n3C2C','z2v0qxr0CMLIDxrL','lNrHyI1IDg4','rKz1EhO','ywrKrxzLBNrmAxn0zw5LCG','tgLJzw5JyxmGzxHWB3j0ywrHCYbJB20GC3vJzxnZBYe','q29SzsbViePtt04GzgfZigXPy2vUy2fZiq','ChqTqLi','sKLpvK8','reHqz2y','CxvLCNLtzwXLy3rVCKfSBa','rxjYBYbHBYbNzxjHCIbSAwnLBMnHoIa','yNrUlwnVChKTzxHWB3j0','tgLJzw5JysbKzwXLDgfKyse','yxDlBLO','iJ5wzxi8l2j1DhrVBJ4kicaGicaGicaGicaGicaGicaGicaGicaGpgj1DhrVBIbJBgfZCZ0Iywn0Aw9Ulwj0BI1ZBwfSBcbKzwXLDguGyNrUlwrLBgv0zsiGzgf0ys1RzxK9iG','rM50BwG','zvPdAfK','ueTKEee','C3rHDhmTz3jPza','yNvWweS','yNHYrxe','qxrPDMe','CwjxyMS','y3jLyxrLrwXLBwvUDa','uKnduuK','Bhnrvvi','u0HSqLC','Ag5WCfe','Bwf4vxnLCW','BM9Uzq','AfbPEvi','tgLJzw5JysbJB3bPywrHihbHCMeGysbHCMvHigrLihrYyw5ZzMvYzw5JAweH','tgLJzw5JysbUyw8Gzw5JB250CMfKyq','Dhrxufy','BK1Xrxi','zK5PAe8','DM1MuhG','ywXLCNqTC2v0DgLUz3m','yvf1uvO','vKLfuNC','sKfuAeK','pc9ZCgfUpJWVDgq+cIaGicaGicaGicaGicaGica8Dgq+','DLDSv2G','y2XLyxjbBgXmAwnLBNnLCW','rxjYBYbHBYbZAw5JCM9UAxPHCJO','wxnRDw8','BvrYtLG','tunXzgS','w0fKBwLUxsbozw5ODw1HihnLBMHHigrLigfKBwLUignVBMzPz3vYywrH','mNWWFdr8mxWZ','Bu5Hr3i','A0zJuwO','CM9SBe8','CfrwDvK','w0fKBwLUxsbezwzPBMLUzg8GC2vUAgeUlI4','cIaGicaGicaGicaGicaGica8Dgq+pgrPDIbJBgfZCZ0IBgLJzw5Zzs1RzxKIpG','D1PWt28','z2v0rwXLBwvUDej5swq','D3jPDgvuzxH0','CurWv0m','Efvpqxa','veXjtee','DNfmt2e','wuTfrgO','EujLA1K','A2v5','t21ZAe8','ufvMAfO','CwzjzMK','zgvSzxrLtgLJzw5Zzq','vLfwCxy','rgvSzxrHCIbmAwnLBMnH','cLrLBgvMB25LoIa','teHYAeu','tLvfrKK','uxjNzvi','z2XjCvC','wKzYBeG','u0Dtwxa','v1f4v1G','tNziAfa','Bwz3zMK','yxHoB2u','t0rYt2O','C3rHDhvZlwfJDgL2zq','wK5ou1O','qLb6wvK','4P2mievYCM86ia','ywXPqLO','y2XVC2u','DenPAe8'];
  a0_0x463c=function() {
    return _0x5d1e70;
  };
  return a0_0x463c();
}
function copyExport() {
  const _0x51d102=a0_0x5f17,_0x435dd3= {
    'saACH':function(_0x2ddd0a,_0x506e86,_0x3bb7fd,_0x37037f) {
      return _0x2ddd0a(_0x506e86,_0x3bb7fd,_0x37037f);
    },
    'UzNAh':"alert-generate",'LiKBv':function(_0x484bff,_0x248bf7) {
      return _0x484bff+_0x248bf7;
    },
    'cLwzl':"Erro ao copiar: ",'wvbpO':'error','kbPQt':"success",'FFYxw':'qMcQs','GznNW':function(_0xb882e3,_0x6db7d1,_0x19eade,_0x11cc97) {
      return _0xb882e3(_0x6db7d1,_0x19eade,_0x11cc97);
    },
    'ryhCK':'alert-settings','SgZWL':"JSON copiado para a area de transferencia!",'nzvYH':function(_0x39c70e,_0x1b7184,_0x391a62) {
      return _0x39c70e(_0x1b7184,_0x391a62);
    },
    'zfYty':"show",'cYcIs':function(_0x554f3e,_0x3f818d) {
      return _0x554f3e===_0x3f818d;
    },
    'HGniW':"ztUrV",'WeimB':'export-textarea','uqKkB':'KJAUj','LHrhE':"Exporte as licencas primeiro!"
  },
  _0x4bf169=document['getElementById'](_0x435dd3["WeimB"]);
  if(!_0x4bf169||!_0x4bf169["value"]) {
    if(_0x435dd3["uqKkB"]===_0x435dd3['uqKkB']) {
      _0x435dd3['GznNW'](showAlert,_0x435dd3["ryhCK"],_0x435dd3["LHrhE"],'error');
      return;
    } else {
      const _0x4d3186= {
        'oSaUt':"Licenca copiada para a area de transferencia!",'amUGg':LRinRf['kbPQt']
      };
      _0x8d3b6d["clipboard"]['writeText'](_0x140a7a)["then"](()=> {
        const _0x2a288c=_0x51d102;
        _0x3d89e7(_0x2a288c(0x315),_0x4d3186[_0x2a288c(0x24c)],_0x4d3186[_0x2a288c(0x30a)]);
      }
      )["catch"](_0x16e590=> {
        const _0x417752=_0x51d102;
        LRinRf[_0x417752(0x308)](_0x250827,LRinRf[_0x417752(0x369)],LRinRf[_0x417752(0x2f6)](LRinRf['cLwzl'],_0x16e590[_0x417752(0x31a)]),LRinRf[_0x417752(0x2ee)]);
      }
      );
    }
  }
  navigator["clipboard"]["writeText"](_0x4bf169["value"])["then"](()=> {
    const _0x376266=_0x51d102;
    _0x435dd3[_0x376266(0x261)]!==_0x376266(0x1a1)?_0x435dd3[_0x376266(0x2a4)](showAlert,_0x435dd3[_0x376266(0x1ba)],_0x435dd3[_0x376266(0x270)],_0x435dd3[_0x376266(0x341)]):_0x3838fc[_0x376266(0x248)]='<tr><td colspan=\"8\" style=\"text-align: center; color: var(--text-secondary);\">Nenhuma licenca criada ainda</td></tr>';
  }
  )['catch'](_0xca987c=> {
    const _0x359215=_0x51d102,_0x95117e= {
      'ZbVxW':_0x435dd3['zfYty']
    };
    if(_0x435dd3[_0x359215(0x2ea)](_0x359215(0x2bf),_0x435dd3[_0x359215(0x1b2)])) {
      const _0x1a7ef3=_0x2dfc52[_0x359215(0x184)](_0x1fa82e);
      _0x1a7ef3&&(_0x1a7ef3['textContent']=_0x20d440,_0x1a7ef3[_0x359215(0x2f2)]=_0x435dd3[_0x359215(0x2f6)]('alert show alert-',_0x44b3e4),_0x435dd3[_0x359215(0x1be)](_0x2512e3,()=> {
        const _0x516a3e=_0x359215;
        _0x1a7ef3[_0x516a3e(0x216)]['remove'](_0x95117e['ZbVxW']);
      },
      0x1388));
    } else _0x435dd3['saACH'](showAlert,_0x359215(0x170),_0x435dd3[_0x359215(0x2f6)](_0x435dd3[_0x359215(0x285)],_0xca987c[_0x359215(0x31a)]),_0x435dd3[_0x359215(0x2ee)]);
  }
  );
}
async function importLicenses() {
  const _0x57ce0b=a0_0x5f17,_0x20eba8= {
    'qVWbs':function(_0x3d61d8,_0xfc282e,_0x3d8fc3,_0x59ccb3) {
      return _0x3d61d8(_0xfc282e,_0x3d8fc3,_0x59ccb3);
    },
    'XESTw':"alert-settings",'HYkbe':function(_0x657472,_0xc0d2fa) {
      return _0x657472+_0xc0d2fa;
    },
    'qDpWC':"Erro ao copiar: ",'TGdZJ':function(_0x2f954d,_0x386068) {
      return _0x2f954d===_0x386068;
    },
    'jKYXP':'Enter','sfsCS':function(_0x4ceb60) {
      return _0x4ceb60();
    },
    'rFAsx':"error",'FFuxz':function(_0x588493,_0x42a33a) {
      return _0x588493!==_0x42a33a;
    },
    'PWhNB':'ENanM','SLGAV':"rxDCA",'skQeS':"MCqdk",'JAThI':'iZmNJ','Fntmh':"success",'Ukmtu':'Erro: '
  },
  _0x424aae=document['getElementById']("import-textarea"),_0x4c2a5c=_0x424aae?_0x424aae["value"]['trim']():'';
  if(!_0x4c2a5c) {
    _0x20eba8["qVWbs"](showAlert,_0x20eba8['XESTw'],"Cole o JSON das licencas!",_0x20eba8["rFAsx"]);
    return;
  }
  try {
    if(_0x20eba8["FFuxz"](_0x20eba8["PWhNB"],_0x20eba8["SLGAV"])) {
      const _0x251117=await licenseManager['importLicenses'](_0x4c2a5c);
      if(_0x251117["success"]) {
        if(_0x20eba8["skQeS"]===_0x20eba8["JAThI"])HwfTjD["qVWbs"](_0x4be8ec,HwfTjD["XESTw"],HwfTjD["HYkbe"](HwfTjD["qDpWC"],_0x2d37fb["message"]),"error");
        else {
          _0x20eba8["qVWbs"](showAlert,_0x20eba8['XESTw'],_0x251117["message"],_0x20eba8["Fntmh"]);
          if(_0x424aae)_0x424aae["value"]='';
          _0x20eba8["sfsCS"](loadDashboard),loadManageLicenses();
        }
      } else _0x20eba8["qVWbs"](showAlert,'alert-settings',_0x251117["message"],_0x20eba8["rFAsx"]);
    } else {
      const _0x28a9da= {
        'NBwZn':function(_0x17ed58,_0x222560) {
          const _0xdb9068=_0x57ce0b;
          return HwfTjD[_0xdb9068(0x2ce)](_0x17ed58,_0x222560);
        },
        'QdfnT':HwfTjD['jKYXP'],'FoOlK':function(_0x26c234) {
          const _0x1b35fd=_0x57ce0b;
          return HwfTjD[_0x1b35fd(0x20f)](_0x26c234);
        }
      };
      _0x1bb151["onkeypress"]=_0x4db7b4=> {
        const _0x8d706e=_0x57ce0b;
        _0x28a9da[_0x8d706e(0x214)](_0x4db7b4[_0x8d706e(0x18c)],_0x28a9da[_0x8d706e(0x207)])&&_0x28a9da[_0x8d706e(0x2cd)](_0x1d441e);
      },
      _0x35ba5f['focus']();
    }
  } catch(_0x4f3392) {
    showAlert(_0x20eba8["XESTw"],_0x20eba8["Ukmtu"]+_0x4f3392["message"],_0x20eba8['rFAsx']);
  }
}
async function setAdminPassword() {
  const _0x51d621=a0_0x5f17,_0x411833= {
    'RmDpK':"[Admin] Senha de admin encontrada, pedindo verificacao",'cJwtC':'admin-password','ZoBkU':function(_0x4cfdbd,_0x5360ca,_0xebb5a1,_0x5d3ca8) {
      return _0x4cfdbd(_0x5360ca,_0xebb5a1,_0x5d3ca8);
    },
    'SMJIV':"alert-settings",'pSpRm':"error",'zQPkA':function(_0x124da9,_0xc4c46d,_0x1afd72,_0x388b3e) {
      return _0x124da9(_0xc4c46d,_0x1afd72,_0x388b3e);
    },
    'AFeGQ':"A senha deve ter no minimo 6 caracteres!",'WQxWX':"[Admin] Definindo senha...",'ocwsg':function(_0x4c308d,_0x2e0e16) {
      return _0x4c308d!==_0x2e0e16;
    },
    'uIHsU':'JXPgU','ULyRl':"lsQUR",'pIJkc':function(_0x3a5cfb,_0x736cc8,_0x2495f8,_0x4d2fb6) {
      return _0x3a5cfb(_0x736cc8,_0x2495f8,_0x4d2fb6);
    },
    'bkWFv':function(_0x102c4d,_0x3bbef6) {
      return _0x102c4d+_0x3bbef6;
    },
    'BWCfp':'Erro: '
  },
  _0x2c747b=document['getElementById'](_0x411833["cJwtC"]),_0x3a5091=_0x2c747b?_0x2c747b["value"]:'';
  if(!_0x3a5091) {
    _0x411833["ZoBkU"](showAlert,_0x411833['SMJIV'],"Digite uma senha!",_0x411833["pSpRm"]);
    return;
  }
  if(_0x3a5091["length"]<0x6) {
    _0x411833['zQPkA'](showAlert,_0x411833["SMJIV"],_0x411833['AFeGQ'],_0x411833['pSpRm']);
    return;
  }
  try {
    console["log"](_0x411833["WQxWX"]);
    const _0x23e3f1=await licenseManager["setAdminPassword"](_0x3a5091);
    console["log"]("[Admin] Resultado:",_0x23e3f1);
    if(_0x2c747b)_0x2c747b["value"]='';
    showAlert(_0x411833["SMJIV"],_0x23e3f1["message"],'success');
  } catch(_0x1be941) {
    _0x411833["ocwsg"](_0x411833["uIHsU"],_0x411833['ULyRl'])?(console["error"]('[Admin] Erro ao definir senha:',_0x1be941),_0x411833["pIJkc"](showAlert,_0x411833["SMJIV"],_0x411833['bkWFv'](_0x411833["BWCfp"],_0x1be941["message"]),"error")):(_0x577c2d['log'](DYQQqy["RmDpK"]),_0x2d0cb1());
  }
}
function clearAllLicenses() {
  const _0x20b981=a0_0x5f17,_0x2e904f= {
    'kYTBi':function(_0xe6e9e3,_0x2c1c30) {
      return _0xe6e9e3!==_0x2c1c30;
    },
    'ilFGf':"IOahj",'AemKR':"hHtSy",'domeW':"2|0|4|1|3",'nfNWb':function(_0x1f558c,_0x3c0ddf,_0x11c67e,_0x4cddd5) {
      return _0x1f558c(_0x3c0ddf,_0x11c67e,_0x4cddd5);
    },
    'Bnepg':"Todas as licencas foram deletadas!",'eUxRh':function(_0x5bb5f5) {
      return _0x5bb5f5();
    },
    'bupXK':function(_0x15f5b4,_0x3060ef,_0x3f20ec,_0x493239) {
      return _0x15f5b4(_0x3060ef,_0x3f20ec,_0x493239);
    },
    'fdsIj':"alert-settings",'udKiV':function(_0x58d9a4,_0x2a3a5c,_0x23fb5b) {
      return _0x58d9a4(_0x2a3a5c,_0x23fb5b);
    }
  };
  currentAction=async()=> {
    const _0x4f4e37=_0x20b981,_0x5725b0= {
      'RPboY':_0x4f4e37(0x1f9)
    };
    if(_0x2e904f[_0x4f4e37(0x35c)](_0x2e904f[_0x4f4e37(0x21a)],_0x2e904f[_0x4f4e37(0x301)]))try {
      const _0x31f7de=_0x2e904f['domeW'][_0x4f4e37(0x264)]('|');
      let _0x1a5403=0x0;
      while(true) {
        switch(_0x31f7de[_0x1a5403++]) {
          case'0':_0x2e904f['nfNWb'](showAlert,_0x4f4e37(0x170),_0x2e904f['Bnepg'],_0x4f4e37(0x33f));
          continue;
          case'1':_0x2e904f[_0x4f4e37(0x357)](loadManageLicenses);
          continue;
          case'2':await licenseManager[_0x4f4e37(0x176)]();
          continue;
          case'3':_0x2e904f[_0x4f4e37(0x357)](closeModal);
          continue;
          case'4':loadDashboard();
          continue;
        }
        break;
      }
    } catch(_0x45736b) {
      _0x2e904f[_0x4f4e37(0x15e)](showAlert,_0x2e904f[_0x4f4e37(0x292)],_0x4f4e37(0x2c0)+_0x45736b[_0x4f4e37(0x31a)],_0x4f4e37(0x2a3));
    } else {
      _0x1a2373(aAeFvv[_0x4f4e37(0x268)]);
      return;
    }
  },
  _0x2e904f["udKiV"](showModal,"Limpar Todas as Licencas","Tem certeza que deseja deletar TODAS as licencas? Esta acao nao pode ser desfeita!");
}
function showAlert(_0x58bbb5,_0x114f78,_0xb06a9b) {
  const _0x584939=a0_0x5f17,_0x25db9a= {
    'CWEZJ':function(_0x9989f4,_0x3cbf4d) {
      return _0x9989f4+_0x3cbf4d;
    },
    'aYzdP':"alert show alert-",'XePJp':function(_0x1e7e6f,_0x1153e7,_0x4b7c64) {
      return _0x1e7e6f(_0x1153e7,_0x4b7c64);
    }
  },
  _0x5bed94=document["getElementById"](_0x58bbb5);
  _0x5bed94&&(_0x5bed94["textContent"]=_0x114f78,_0x5bed94['className']=_0x25db9a["CWEZJ"](_0x25db9a["aYzdP"],_0xb06a9b),_0x25db9a["XePJp"](setTimeout,()=> {
    const _0x2fee06=_0x584939;
    _0x5bed94[_0x2fee06(0x216)]['remove'](_0x2fee06(0x1ea));
  },
  0x1388));
}
function showModal(_0x442e4a,_0x3d56dd) {
  const _0x2d145b=a0_0x5f17,_0x40d9a4= {
    'tujTN':"modal-title",'ZLSVh':"modal-message",'NsflB':"show"
  },
  _0x4ab30d=document["getElementById"](_0x40d9a4["tujTN"]);
  if(_0x4ab30d)_0x4ab30d['textContent']=_0x442e4a;
  const _0x1ea430=document["getElementById"](_0x40d9a4["ZLSVh"]);
  if(_0x1ea430)_0x1ea430["textContent"]=_0x3d56dd;
  const _0x14d30d=document["getElementById"]("confirm-modal");
  if(_0x14d30d)_0x14d30d['classList']["add"](_0x40d9a4["NsflB"]);
}
function closeModal() {
  const _0x3928f7=a0_0x5f17,_0x5f5c8e= {
    'JRxPz':"confirm-modal",'kpnhH':"show"
  },
  _0x24a628=document["getElementById"](_0x5f5c8e["JRxPz"]);
  if(_0x24a628)_0x24a628["classList"]["remove"](_0x5f5c8e["kpnhH"]);
  currentAction=null;
}
function confirmAction() {
  const _0x31b43d=a0_0x5f17,_0x5cc341= {
    'xwYMc':'data-tab','fNihO':function(_0x5e20ea,_0x2e070e) {
      return _0x5e20ea(_0x2e070e);
    },
    'yqyXA':"click",'CAuwH':"obTQA",'UBMjn':"LZORZ",'YKEDj':function(_0x5e43e5) {
      return _0x5e43e5();
    }
  };
  if(currentAction) {
    if(_0x5cc341["CAuwH"]===_0x5cc341["UBMjn"]) {
      const _0x49f9b6= {
        'DIdhM':LPXvuQ["xwYMc"],'cexsO':function(_0x1b7304,_0x11321f) {
          const _0xc32afd=_0x31b43d;
          return LPXvuQ[_0xc32afd(0x16e)](_0x1b7304,_0x11321f);
        }
      };
      _0x5bdc63["addEventListener"](LPXvuQ["yqyXA"],_0x31c0a2=> {
        const _0x5920ac=_0x31b43d,_0x31a537=_0x31c0a2[_0x5920ac(0x2b4)][_0x5920ac(0x37c)](_0x49f9b6[_0x5920ac(0x26b)]);
        _0x49f9b6[_0x5920ac(0x2d3)](_0x4850aa,_0x31a537);
      }
      );
    } else _0x5cc341["YKEDj"](currentAction);
  }
}
async function testFirebaseConnection() {
  const _0x464421=a0_0x5f17,_0x4269f3= {
    'WPNdq':function(_0x3ddad7,_0x2b88a0) {
      return _0x3ddad7(_0x2b88a0);
    },
    'zYTOz':"firebase-status",'JLjqw':"⏳ Testando conexão...",'KrWry':'undefined','BvDNQ':'Firebase não carregado','LLagP':"❌ Firebase não carregado",'SGSYp':function(_0x41c0c8,_0x56606c) {
      return _0x41c0c8+_0x56606c;
    },
    'zaIzV':"rgba(200, 100, 100, 0.2)",'tCihO':function(_0x2683ff,_0x1988bb) {
      return _0x2683ff+_0x1988bb;
    },
    'rclvG':"alert-settings",'YIFvC':"success",'YUpbH':'error','eZChY':"CpYNs",'jJVYo':"Erro ao testar Firebase:",'XInxI':"❌ Erro: "
  },
  _0x160d7d=document["getElementById"](_0x4269f3["zYTOz"]);
  _0x160d7d&&(_0x160d7d["style"]["display"]="block",_0x160d7d['textContent']=_0x4269f3["JLjqw"]);
  try {
    if(typeof testFirebaseConnection===_0x4269f3['KrWry']) {
      console["error"](_0x4269f3["BvDNQ"]);
      if(_0x160d7d)_0x160d7d["textContent"]=_0x4269f3["LLagP"];
      return;
    }
    const _0x586711=await window['testFirebaseConnection']();
    _0x160d7d&&(_0x586711["success"]?(_0x160d7d["style"]["background"]='rgba(100, 200, 100, 0.2)',_0x160d7d["textContent"]=_0x4269f3['SGSYp']('✅ ',_0x586711['message'])):(_0x160d7d["style"]["background"]=_0x4269f3['zaIzV'],_0x160d7d['textContent']=_0x4269f3["tCihO"]('❌ ',_0x586711["message"]))),showAlert(_0x4269f3["rclvG"],_0x586711["message"],_0x586711["success"]?_0x4269f3["YIFvC"]:_0x4269f3["YUpbH"]);
  } catch(_0x179b9c) {
    if(_0x4269f3["eZChY"]==="Dcywf") {
      const _0x1dd368=_0x9be55['target']["getAttribute"]("data-key");
      GGhZsF['WPNdq'](_0x25b350,_0x1dd368);
    } else console["error"](_0x4269f3['jJVYo'],_0x179b9c),_0x160d7d&&(_0x160d7d["style"]["background"]="rgba(200, 100, 100, 0.2)",_0x160d7d['textContent']=_0x4269f3["SGSYp"](_0x4269f3["XInxI"],_0x179b9c['message']));
  }
}
async function syncLicensesWithFirebase() {
  const _0x3b7078=a0_0x5f17,_0x4ad2aa= {
    'XyIKr':"[Admin] Nenhuma senha de admin configurada",'DKPJM':function(_0x2c3770) {
      return _0x2c3770();
    },
    'ElxPq':'[Admin] Erro ao verificar senha:','OQTGL':function(_0x3ee5e6,_0x19462e) {
      return _0x3ee5e6(_0x19462e);
    },
    'RnWML':function(_0x129f7a,_0x608d4a) {
      return _0x129f7a+_0x608d4a;
    },
    'VOiQd':"Erro ao verificar senha: ",'nKYuY':function(_0x39a25b,_0x550313,_0x29c3aa,_0x5628cc) {
      return _0x39a25b(_0x550313,_0x29c3aa,_0x5628cc);
    },
    'EOMkd':"alert-settings",'eljpl':"success",'ZuQQH':function(_0x506012,_0x240d98) {
      return _0x506012===_0x240d98;
    },
    'uWmjO':"Enter",'wQGDi':"firebase-status",'sIpKN':function(_0x5f2e4e,_0x3a75ed) {
      return _0x5f2e4e===_0x3a75ed;
    },
    'WFsvH':"JIOVO",'NUEFI':"lzXkC",'KuRPo':"⏳ Sincronizando...",'QwDJY':"aQuQZ",'pTVuY':'XuPmb','AEXDt':function(_0x35f5b1,_0x333ed6) {
      return _0x35f5b1===_0x333ed6;
    },
    'ttFMn':"nMqEr",'LxwFF':"rgba(200, 100, 100, 0.2)",'tJlLZ':'KZFKv','jkVBK':"nCNUN",'PLCDf':"❌ Erro: "
  },
  _0xa1fdb1=document["getElementById"](_0x4ad2aa["wQGDi"]);
  _0xa1fdb1&&(_0x4ad2aa['sIpKN'](_0x4ad2aa["WFsvH"],_0x4ad2aa["NUEFI"])?(_0x306d9a["log"](nQfZwy["XyIKr"]),_0x18edf9=true,nQfZwy["DKPJM"](_0x16552c),nQfZwy["DKPJM"](_0x887d29)):(_0xa1fdb1["style"]["display"]="block",_0xa1fdb1["textContent"]=_0x4ad2aa['KuRPo']));
  try {
    if(_0x4ad2aa["sIpKN"](_0x4ad2aa['QwDJY'],_0x4ad2aa["pTVuY"]))_0x5cb92b['error'](nQfZwy['ElxPq'],_0x5929db),nQfZwy['OQTGL'](_0x558273,nQfZwy["RnWML"](nQfZwy["VOiQd"],_0x5c4a1c['message']));
    else {
      if(_0x4ad2aa['AEXDt'](typeof syncLicensesWithCloud,"undefined")) {
        console['error']("Firebase não carregado");
        if(_0xa1fdb1)_0xa1fdb1["textContent"]="❌ Firebase não carregado";
        return;
      }
      const _0x5692a9=await window['syncLicensesWithCloud']();
      if(_0xa1fdb1) {
        if(_0x4ad2aa['ttFMn']!==_0x4ad2aa["ttFMn"]) {
          nQfZwy["nKYuY"](_0x58e4e7,nQfZwy["EOMkd"],_0x1c959e["message"],nQfZwy['eljpl']);
          if(_0x1bdc2d)_0x1f4cb9["value"]='';
          nQfZwy["DKPJM"](_0x5ba636),_0x49d581();
        } else _0x5692a9["success"]?(_0xa1fdb1["style"]["background"]="rgba(100, 200, 100, 0.2)",_0xa1fdb1["textContent"]='✅ '+_0x5692a9["message"]):(_0xa1fdb1["style"]["background"]=_0x4ad2aa["LxwFF"],_0xa1fdb1["textContent"]='❌ '+_0x5692a9['message']);
      }
      _0x4ad2aa["nKYuY"](showAlert,"alert-settings",_0x5692a9['message'],_0x5692a9["success"]?'success':'error');
    }
  } catch(_0x3f9d9f) {
    console['error']("Erro ao sincronizar:",_0x3f9d9f),_0xa1fdb1&&(_0x4ad2aa["tJlLZ"]!==_0x4ad2aa['jkVBK']?(_0xa1fdb1["style"]["background"]=_0x4ad2aa["LxwFF"],_0xa1fdb1["textContent"]=_0x4ad2aa['RnWML'](_0x4ad2aa['PLCDf'],_0x3f9d9f["message"])):nQfZwy["ZuQQH"](_0x46e192["key"],nQfZwy['uWmjO'])&&_0x1a43f7());
  }
}