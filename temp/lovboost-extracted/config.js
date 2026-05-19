const a0_0x5ce1d6=a0_0x1dd8;
(function(_0x31ec63,_0x271084) {
  const _0x418d15=a0_0x1dd8,_0x3cc2a6=_0x31ec63();
  while(true) {
    try {
      const _0x4aadb3=parseInt("18002tfAsGz")/0x1*(parseInt("60fbACrP")/0x2)+parseInt("1233uNIfbd")/0x3*(parseInt("2136IaPIVX")/0x4)+parseInt("850QSCuka")/0x5*(parseInt("25086IPnwuG")/0x6)+parseInt("5488567PSAduT")/0x7+parseInt("3437976wUjpvI")/0x8*(parseInt("9oMvraD")/0x9)+parseInt("4990LCptUY")/0xa*(-parseInt("7612oCprRK")/0xb)+parseInt("12HiHMIj")/0xc*(-parseInt("23863866BfBgNW")/0xd);
      if(_0x4aadb3===_0x271084)break;
      else _0x3cc2a6['push'](_0x3cc2a6['shift']());
    } catch(_0x546b3b) {
      _0x3cc2a6['push'](_0x3cc2a6['shift']());
    }
  }
}
(a0_0x5f41,0x7ad66));
const CONFIG= {
  'REQUIRE_LICENSE':true,'FIREBASE_URL':"https://master-lovable-infinity-default-rtdb.firebaseio.com",'CACHE_DURATION':0x5*0x3c*0x3e8
};
let licenseCache= {
},
cacheTimestamp=0x0;
async function generateDeviceFingerprint() {
  const _0x40d11a=a0_0x5ce1d6,_0xd48860= {
    'bUJJz':"cpu_unknown_",'dwyig':"[Auth] ❌ Erro ao atualizar Firebase",'DItrb':"Erro ao ativar licença. Tente novamente.",'AnXHb':'HEFEb','nHukC':"fgecw",'QmYCs':function(_0x2d7c0d,_0xfd3c93) {
      return _0x2d7c0d+_0xfd3c93;
    },
    'tCzhB':function(_0x211e02,_0x5abf43) {
      return _0x211e02+_0x5abf43;
    },
    'VtwSC':"ua_",'HACMR':function(_0x4d8e56,_0xdd9006) {
      return _0x4d8e56+_0xdd9006;
    },
    'wLSFU':'screen_','ufikJ':function(_0xaedfe4,_0x20741f) {
      return _0xaedfe4+_0x20741f;
    },
    'HoQcC':"tz_",'KNChB':"lang_",'EGtvu':function(_0x2b7d33,_0x5e1178) {
      return _0x2b7d33(_0x5e1178);
    },
    'JVZld':"ZNlrb",'tUZZp':"ztsfT",'wxhKf':"[Config] Erro ao gerar fingerprint:"
  };
  try {
    if(_0xd48860["AnXHb"]===_0xd48860['nHukC'])_0x493891+=_0xd48860["bUJJz"];
    else {
      let _0xd36f12='';
      try {
        const _0x5385dc=await navigator["deviceMemory"]||"unknown";
        _0xd36f12+=_0xd48860["QmYCs"]("cpu_",_0x5385dc)+'_';
      } catch(_0x6bcb29) {
        _0xd36f12+=_0xd48860["bUJJz"];
      }
      const _0x524bfd=navigator["userAgent"];
      _0xd36f12+=_0xd48860["tCzhB"](_0xd48860["VtwSC"]+_0x524bfd["substring"](0x0,0x64)['replace'](/[^a-zA-Z0-9]/g,''),'_');
      const _0x5de27c=window["screen"];
      _0xd36f12+=_0xd48860['HACMR'](_0xd48860["QmYCs"](_0xd48860["QmYCs"](_0xd48860["wLSFU"],_0x5de27c["width"]),'x'),_0x5de27c["height"])+'_';
      const _0x54d0da=Intl["DateTimeFormat"]()["resolvedOptions"]()['timeZone'];
      _0xd36f12+=_0xd48860["ufikJ"](_0xd48860["HoQcC"],_0x54d0da["replace"](/[^a-zA-Z0-9]/g,''))+'_';
      const _0x4e92e0=navigator["language"];
      _0xd36f12+=_0xd48860['HACMR'](_0xd48860["KNChB"],_0x4e92e0["replace"](/[^a-zA-Z0-9]/g,''));
      const _0x5b22bf=await _0xd48860["EGtvu"](hashString,_0xd36f12);
      return console["log"]("[Config] Fingerprint gerado:",_0x5b22bf),_0x5b22bf;
    }
  } catch(_0x5a6f77) {
    return _0xd48860["JVZld"]===_0xd48860["tUZZp"]?(_0x26a0a9["log"](_0xd48860["dwyig"]), {
      'valid':false,'message':_0xd48860["DItrb"]
    }
    ):(console["error"](_0xd48860["wxhKf"],_0x5a6f77),_0xd48860["tCzhB"]("UNKNOWN_DEVICE_",Date['now']()));
  }
}
async function hashString(_0xd74b4d) {
  const _0x14d2f8=a0_0x5ce1d6,_0x562cce= {
    'NWScB':"[Config] Erro ao verificar integridade:",'fAHJt':function(_0x529306,_0x1f6535) {
      return _0x529306!==_0x1f6535;
    },
    'SmtfT':"alNxg",'ZjOil':"SHA-256",'fxRiq':"[Config] Erro ao gerar hash:",'CeXdG':function(_0x291730,_0x585d3d) {
      return _0x291730<_0x585d3d;
    },
    'NxekH':function(_0x5a8a6c,_0x484f14) {
      return _0x5a8a6c+_0x484f14;
    },
    'nPKHb':function(_0x2a9484,_0x34b75c) {
      return _0x2a9484-_0x34b75c;
    },
    'kCEZI':function(_0x30450f,_0x5f4fa2) {
      return _0x30450f&_0x5f4fa2;
    }
  };
  try {
    if(_0x562cce["fAHJt"](_0x562cce["SmtfT"],_0x562cce["SmtfT"]))return _0x415f53["error"](_0x562cce["NWScB"],_0x5c2bf5),true;
    else {
      const _0x243d8a=new TextEncoder(),_0xf30c3f=_0x243d8a["encode"](_0xd74b4d),_0x5bd4c3=await crypto["subtle"]["digest"](_0x562cce['ZjOil'],_0xf30c3f),_0x197a74=Array["from"](new Uint8Array(_0x5bd4c3)),_0x665541=_0x197a74['map'](_0x608ad2=>_0x608ad2["toString"](0x10)["padStart"](0x2,'0'))["join"]('');
      return _0x665541["substring"](0x0,0x20);
    }
  } catch(_0x118121) {
    console["error"](_0x562cce["fxRiq"],_0x118121);
    let _0x1070e5=0x0;
    for(let _0x14ebf7=0x0;
    _0x562cce["CeXdG"](_0x14ebf7,_0xd74b4d["length"]);
    _0x14ebf7++) {
      const _0x8e823f=_0xd74b4d["charCodeAt"](_0x14ebf7);
      _0x1070e5=_0x562cce["NxekH"](_0x562cce["nPKHb"](_0x1070e5<<0x5,_0x1070e5),_0x8e823f),_0x1070e5=_0x562cce["kCEZI"](_0x1070e5,_0x1070e5);
    }
    return Math["abs"](_0x1070e5)["toString"](0x10);
  }
}
async function getDeviceFingerprint() {
  const _0x4156c5=a0_0x5ce1d6,_0x4dd081= {
    'uHRQv':'deviceFingerprint','MEofg':"[Config] Fingerprint recuperado do storage",'hprOo':function(_0x527a2a) {
      return _0x527a2a();
    },
    'sCMZm':"[Config] Novo fingerprint gerado e armazenado",'nkryO':"UNKNOWN_DEVICE"
  };
  try {
    const _0x5f2ead=await chrome["storage"]["local"]['get'](_0x4dd081["uHRQv"]);
    if(_0x5f2ead["deviceFingerprint"])return console['log'](_0x4dd081['MEofg']),_0x5f2ead["deviceFingerprint"];
    const _0x381020=await _0x4dd081["hprOo"](generateDeviceFingerprint);
    return await chrome["storage"]["local"]["set"]( {
      'deviceFingerprint':_0x381020
    }
    ),console["log"](_0x4dd081['sCMZm']),_0x381020;
  } catch(_0x322b19) {
    return console['error']("[Config] Erro ao obter fingerprint:",_0x322b19),_0x4dd081["nkryO"];
  }
}
function a0_0x1dd8(_0x492236,_0x38a77a) {
  _0x492236=_0x492236-0x179;
  const _0x5f419d=a0_0x5f41();
  let _0x1dd805=_0x5f419d[_0x492236];
  if(a0_0x1dd8['zzkKHf']===undefined) {
    var _0x1033c8=function(_0x3964db) {
      const _0x25120d='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
      let _0x2ce86b='',_0x493891='';
      for(let _0x1c1fc1=0x0,_0x52ba58,_0x2520bc,_0x5866ff=0x0;
      _0x2520bc=_0x3964db['charAt'](_0x5866ff++);
      ~_0x2520bc&&(_0x52ba58=_0x1c1fc1%0x4?_0x52ba58*0x40+_0x2520bc:_0x2520bc,_0x1c1fc1++%0x4)?_0x2ce86b+=String['fromCharCode'](0xff&_0x52ba58>>(-0x2*_0x1c1fc1&0x6)):0x0) {
        _0x2520bc=_0x25120d['indexOf'](_0x2520bc);
      }
      for(let _0x3effec=0x0,_0x1360c5=_0x2ce86b['length'];
      _0x3effec<_0x1360c5;
      _0x3effec++) {
        _0x493891+='%'+('00'+_0x2ce86b['charCodeAt'](_0x3effec)['toString'](0x10))['slice'](-0x2);
      }
      return decodeURIComponent(_0x493891);
    };
    a0_0x1dd8['RQVWSO']=_0x1033c8,a0_0x1dd8['jRdBma']= {
    },
    a0_0x1dd8['zzkKHf']=true;
  }
  const _0x2afdb4=_0x5f419d[0x0],_0x425948=_0x492236+_0x2afdb4,_0x3d210b=a0_0x1dd8['jRdBma'][_0x425948];
  return!_0x3d210b?(_0x1dd805=a0_0x1dd8['RQVWSO'](_0x1dd805),a0_0x1dd8['jRdBma'][_0x425948]=_0x1dd805):_0x1dd805=_0x3d210b,_0x1dd805;
}
async function validateKeySecure(_0x13d53c) {
  const _0x5767d8=a0_0x5ce1d6,_0x4daac8= {
    'umMcR':'[Auth] ❌ Licença não encontrada no Firebase','RCaVl':"Licença não encontrada",'pYZXN':"[Config] Erro ao obter fingerprint:",'DXGSn':"UNKNOWN_DEVICE",'tpsEr':"[Config] Erro ao verificar autenticação:",'XdKzQ':"[Auth] ❌ Licença já foi ativada em outro dispositivo",'fvKlL':"Esta licença já foi ativada em outro computador. Uma licença só pode ser usada em um dispositivo por vez.",'DdJam':"[Auth] ❌ Erro fatal:",'jIImi':function(_0x471bc0,_0x3c4aeb) {
      return _0x471bc0+_0x3c4aeb;
    },
    'rhnRz':'Erro ao validar licença: ','VeewR':function(_0x3bd58b,_0x1c3a1b) {
      return _0x3bd58b===_0x1c3a1b;
    },
    'nUbkf':"Acesso liberado (verificação desabilitada)",'Bxzwz':function(_0xa87d55) {
      return _0xa87d55();
    },
    'LaJSn':function(_0x4b0d73,_0x283606) {
      return _0x4b0d73!==_0x283606;
    },
    'MdhoH':"ZwoHV",'wsumP':"[Auth] ========== INICIANDO VALIDAÇÃO ==========",'XXTSh':'[Auth] Chave:','VASDY':"[Auth] Device Fingerprint:",'yoiKq':"gXoKv",'YeFnF':'rocVJ','ZWCzF':'[Auth] ❌ Licença inativa/inválida','xzxDD':'Licença inativa ou inválida','Knkyo':function(_0x2e4303,_0x236202) {
      return _0x2e4303<_0x236202;
    },
    'GNhJB':"[Auth] ❌ Licença expirada",'ZyxMs':"Licença expirada",'OOMkD':"[Auth] Device anterior:",'lDHdq':function(_0x2fa065,_0x3fb003) {
      return _0x2fa065===_0x3fb003;
    },
    'oyyep':"DTojL",'bEYBw':"[Auth] ✅ Licença já foi ativada neste dispositivo. Acesso permanente concedido.",'UhMlj':"[Auth] ========== VALIDAÇÃO CONCLUÍDA COM SUCESSO ==========",'EgWMY':'Licença ativada neste dispositivo. Acesso permanente.','XESAF':'[Auth] 🔄 Primeira ativação - vinculando ao dispositivo','HMnul':function(_0x29dad3,_0x2440eb) {
      return _0x29dad3+_0x2440eb;
    },
    'DJWaj':"[Auth] Atualizando Firebase com fingerprint do dispositivo",'oGZRl':function(_0x2c5535,_0x36b2c2,_0x3bd37e) {
      return _0x2c5535(_0x36b2c2,_0x3bd37e);
    },
    'DgcgN':"[Auth] ❌ Erro ao atualizar Firebase",'udHcG':"Erro ao ativar licença. Tente novamente.",'IZwdT':"[Auth] ✅ Licença vinculada permanentemente a este dispositivo",'VGNMh':"Licença ativada e vinculada a este dispositivo! Você poderá usar indefinidamente.",'VDDSc':"XZrku",'JWiOV':'BCsmq','hewpE':'[Auth] ========== VALIDAÇÃO FALHOU ==========','hPRXX':function(_0x32c324,_0x232ca5) {
      return _0x32c324+_0x232ca5;
    }
  };
  if(!CONFIG["REQUIRE_LICENSE"])return _0x4daac8["VeewR"]("UsLsO","UsLsO")? {
    'valid':true,'message':_0x4daac8["nUbkf"]
  }
  :(_0x25b169["error"]('[Config] Erro ao obter chave armazenada:',_0x3ebd68),null);
  const _0x44ed54=_0x13d53c['trim'](),_0x40afe6=await _0x4daac8["Bxzwz"](getDeviceFingerprint);
  try {
    if(_0x4daac8["LaJSn"](_0x4daac8["MdhoH"],_0x4daac8['MdhoH']))return _0x18a891['log'](_0x4daac8['umMcR']), {
      'valid':false,'message':_0x4daac8["RCaVl"]
    };
    else {
      console["log"](_0x4daac8["wsumP"]),console["log"](_0x4daac8["XXTSh"],_0x44ed54),console['log'](_0x4daac8['VASDY'],_0x40afe6);
      const _0x8d0f2e=await getLicenseFromCloud(_0x44ed54);
      console["log"]("[Auth] Licença obtida do Firebase:",_0x8d0f2e);
      if(!_0x8d0f2e)return _0x4daac8["yoiKq"]!==_0x4daac8['yoiKq']?(_0x1a1195["error"](EEEzDb["pYZXN"],_0x354d91),EEEzDb['DXGSn']):(console["log"](_0x4daac8["umMcR"]), {
        'valid':false,'message':_0x4daac8['RCaVl']
      }
      );
      if(!_0x8d0f2e["active"])return _0x4daac8["YeFnF"]!=='rocVJ'?(_0xbb7745["error"](_0x4daac8["tpsEr"],_0x22a47a),false):(console["log"](_0x4daac8["ZWCzF"]), {
        'valid':false,'message':_0x8d0f2e["validationMessage"]||_0x4daac8["xzxDD"]
      }
      );
      const _0x1d1268=new Date(_0x8d0f2e['expiryDate']);
      if(_0x4daac8["Knkyo"](_0x1d1268,new Date()))return console["log"](_0x4daac8['GNhJB']), {
        'valid':false,'message':_0x4daac8["ZyxMs"]
      };
      if(_0x8d0f2e["activatedDeviceFingerprint"]&&_0x8d0f2e['activatedDeviceFingerprint']!==_0x40afe6)return console["log"](_0x4daac8["XdKzQ"]),console["log"](_0x4daac8['OOMkD'],_0x8d0f2e["activatedDeviceFingerprint"]),console["log"]("[Auth] Device atual:",_0x40afe6), {
        'valid':false,'message':"Esta licença já foi ativada em outro computador. Uma licença só pode ser usada em um dispositivo por vez."
      };
      if(_0x4daac8["lDHdq"](_0x8d0f2e["activatedDeviceFingerprint"],_0x40afe6))return _0x4daac8["oyyep"]!==_0x4daac8["oyyep"]?(_0x1ded0c['log'](_0x4daac8["XdKzQ"]),_0x5a205d['log']("[Auth] Device anterior:",_0x21dda0["activatedDeviceFingerprint"]),_0x209c6b["log"]("[Auth] Device atual:",_0x5cc4ab), {
        'valid':false,'message':_0x4daac8['fvKlL']
      }
      ):(console['log'](_0x4daac8["bEYBw"]),console['log'](_0x4daac8["UhMlj"]), {
        'valid':true,'message':_0x4daac8["EgWMY"],'license':_0x8d0f2e
      }
      );
      console["log"](_0x4daac8["XESAF"]);
      const _0x390f81=_0x4daac8["HMnul"](_0x8d0f2e["uses"]||0x0,0x1),_0x52acc3= {
        'activatedDeviceFingerprint':_0x40afe6,'activatedDate':new Date()["toISOString"](),'uses':_0x390f81,'lastAccessDate':new Date()["toISOString"]()
      };
      console["log"](_0x4daac8['DJWaj']);
      const _0x230c2a=await _0x4daac8["oGZRl"](updateLicenseInCloud,_0x44ed54,_0x52acc3);
      if(!_0x230c2a)return console['log'](_0x4daac8["DgcgN"]), {
        'valid':false,'message':_0x4daac8["udHcG"]
      };
      return console["log"](_0x4daac8["IZwdT"]),console["log"]('[Auth] ========== VALIDAÇÃO CONCLUÍDA COM SUCESSO =========='), {
        'valid':true,'message':_0x4daac8["VGNMh"],'license':_0x8d0f2e
      };
    }
  } catch(_0x347db6) {
    return _0x4daac8["VDDSc"]===_0x4daac8["JWiOV"]?(_0xca419c["error"](_0x4daac8["DdJam"],_0xc5cc25),_0x41d3d1["log"]('[Auth] ========== VALIDAÇÃO FALHOU =========='), {
      'valid':false,'message':_0x4daac8["jIImi"](_0x4daac8["rhnRz"],_0x43cf4b["message"])
    }
    ):(console["error"](_0x4daac8["DdJam"],_0x347db6),console["log"](_0x4daac8["hewpE"]), {
      'valid':false,'message':_0x4daac8["hPRXX"]("Erro ao validar licença: ",_0x347db6['message'])
    }
    );
  }
}
async function verifyIntegrity() {
  const _0x48f8ab=a0_0x5ce1d6,_0x7aef4= {
    'eWUfQ':"[Config] Fingerprint recuperado do storage",'VxCAe':function(_0x204b15,_0x3c3b7c) {
      return _0x204b15!==_0x3c3b7c;
    },
    'gUBuq':"mlTnM",'GUspA':'cgEOQ','BHzSN':'config.js','PEuow':"codeHash",'OCbmq':'[Config] Código foi modificado!','CtKFb':"lDEbi",'jMlaC':'[Config] Erro ao verificar integridade:'
  };
  try {
    if(_0x7aef4["VxCAe"](_0x7aef4["gUBuq"],_0x7aef4['GUspA'])) {
      const _0x41cf43=await fetch(chrome["runtime"]["getURL"](_0x7aef4["BHzSN"])),_0x5a5674=await _0x41cf43["text"](),_0x21761b=await hashString(_0x5a5674),_0x2693e4=await chrome["storage"]['local']["get"](_0x7aef4["PEuow"]);
      if(_0x2693e4["codeHash"]&&_0x7aef4['VxCAe'](_0x2693e4["codeHash"],_0x21761b))return console["warn"](_0x7aef4["OCbmq"]),false;
      return await chrome["storage"]["local"]["set"]( {
        'codeHash':_0x21761b
      }
      ),true;
    } else _0x1887f5['error']("[Config] Erro ao limpar autenticação:",_0x2e6b7a);
  } catch(_0x245458) {
    return _0x7aef4["CtKFb"]===_0x7aef4['CtKFb']?(console["error"](_0x7aef4["jMlaC"],_0x245458),true):(_0x59656f['log'](nfVfsn["eWUfQ"]),_0x59b5bc["deviceFingerprint"]);
  }
}
async function isAuthenticated() {
  return true;
  /*const _0x5083a0=a0_0x5ce1d6,_0x2ee851= {
    'jAGwW':'[Auth] ✅ Licença já foi ativada neste dispositivo. Acesso permanente concedido.','SBWzc':"[Auth] ========== VALIDAÇÃO CONCLUÍDA COM SUCESSO ==========",'SKyYu':"Licença ativada neste dispositivo. Acesso permanente.",'IknuP':"[Config] Código foi modificado!",'erVOQ':function(_0x15bc26,_0x5a7b28) {
      return _0x15bc26===_0x5a7b28;
    },
    'ItPhX':"wRJfc",'whDdL':"isAuthenticated",'Sbcfu':"licenseKey",'UtVrh':function(_0xc6dafb,_0xb10429) {
      return _0xc6dafb===_0xb10429;
    },
    'cHrMU':function(_0x864651,_0xf94119) {
      return _0x864651!==_0xf94119;
    },
    'bSliZ':"NzYpw",'BwbWS':'rDTmf','WNcnv':'[Config] Erro ao verificar autenticação:'
  };
  try {
    if(_0x2ee851["erVOQ"](_0x2ee851["ItPhX"],_0x2ee851["ItPhX"])) {
      const _0x454bae=await chrome["storage"]["local"]["get"]([_0x2ee851["whDdL"],_0x2ee851["Sbcfu"]]);
      return _0x2ee851["UtVrh"](_0x454bae["isAuthenticated"],true)&&_0x454bae["licenseKey"];
    } else return _0x506d8e['log'](oGDfDO["jAGwW"]),_0x4e1cd0["log"](oGDfDO["SBWzc"]), {
      'valid':true,'message':oGDfDO['SKyYu'],'license':_0x3a7e98
    };
  } catch(_0x3e1232) {
    return _0x2ee851["cHrMU"](_0x2ee851["bSliZ"],_0x2ee851["BwbWS"])?(console["error"](_0x2ee851["WNcnv"],_0x3e1232),false):(_0x2b260d["warn"](oGDfDO["IknuP"]),false);
  }
}
function a0_0x5f41() {
  const _0x218cfc=['AK1Syum','AfbswfG','uw1zq3m','w0nVBMzPz10GrMLUz2vYChjPBNqGCMvJDxbLCMfKBYbKBYbZDg9YywDL','sKDRy28','nJbMyKfdCLa','Dwriy0C','w0nVBMzPz10Gqxv0zw50AwnHzg86','EhP4req','CMHUuNO','tgLJzw7dP2eGyxrPDMfKysbLihzPBMn1BgfKysbHigvZDguGzgLZCg9ZAxrPDM8HifzVy8oQihbVzgvYW6eGDxnHCIbPBMrLzMLUAwrHBwvUDguU','u0Hblti1nG','vu5ltK9xtL9ervzjq0vF','w0nVBMzPz10GrxjYBYbHBYbNzxjHCIbMAw5NzxjWCMLUDdO','z2v0vvjm','uKvrvuLsrv9msunftLnf','ywXoEgC','w0f1DgHDiokDJcbfCNjVigzHDgfSoG','qNDIv1m','D2fYBG','vwHnBgO','tgLJzw7dP2eGBSoJBYbLBMnVBNrYywrH','C2nYzwvU','DwzPA0O','ntq4odu2n1btqwr1va','wK5SCMi','tNPzChC','AKLjBwK','Bg9N','w0f1DgHDid09pt09pt09pt0Gsu5jq0LbtKrpifzbteLeqCohW4npid09pt09pt09pt0','DMfSAwrHDgLVBK1LC3nHz2u','B3L5zxa','DuHsuxy','qw5ysgi','DhbZrxi','w0nVBMzPz10GrxjYBYbHBYbVyNrLCIbMAw5NzxjWCMLUDdO','D3HOs2y','z2v0','Dg9tDhjPBMC','D0XtrLu','AgvPz2H0','wwvgBKy','w0f1DgHDief0DwfSAxPHBMrViezPCMvIyxnLignVBsbMAw5NzxjWCMLUDcbKBYbKAxnWB3nPDgL2BW','wNL4txm','w0nVBMzPz10GtM92BYbMAw5NzxjWCMLUDcbNzxjHzg8GzsbHCM1HEMvUywrV','w0f1DgHDiokDJcbmAwnLBSoNysbQW6eGzM9Pigf0AxzHzgeGzw0GB3v0CM8GzgLZCg9ZAxrPDM8','Dg9ju09tDhjPBMC','D2HezeW','mtjiAuHnswO','BwvZC2fNzq','sxrqAfG','vu5ltK9xtL9ervzjq0u','qNH6D3O','w0f1DgHDieXPy2vUW6DHig9IDgLKysbKBYbgAxjLyMfZztO','vxrwCMG','qwnLC3nVigXPyMvYywrVicH2zxjPzMLJyCoNW6nVigrLC2fIAwXPDgfKysK','mJm4nJm4nJzczKjNtLC','v05JBNy','CNvUDgLTzq','DgfhtxG','rwDxtvK','mJuWodzjug53DuC','BerfyMK','rxjYBYbHBYbHDgL2yxiGBgLJzw7dP2eUifrLBNrLig5VDMfTzw50zs4','vxnmC08','reL0CMi','zKfisNq','zgv2AwnLtwvTB3j5','Dw1ny1i','AxnbDxrOzw50AwnHDgvK','qKH6u04','Dw5RBM93BG','uev1B3C','D2LKDgG','BwXuBK0','wevtquy','nZyXmM9dChjssW','BLvIA2y','DxnLCKrHDge','Den6Aei','oduWuvndDwTH','zvDvzLe','w0f1DgHDierLDMLJzsbHBNrLCMLVCJO','Agv3Ceu','CMvWBgfJzq','tgLJzw7dP2eGyxrPDMfKysbUzxn0zsbKAxnWB3nPDgL2BY4GqwnLC3nVihbLCM1HBMvUDguU','w0nVBMzPz10Gq8oZzgLNBYbMB2KGBw9KAwzPy2fKBYe','vKDotwG','vNHdqwu','AhbYt28','w0nVBMzPz10GrMLUz2vYChjPBNqGz2vYywrVoG','wNDVsfy','u0jxEMm','svP3zfq','sg9ry0m','BgfUz18','rxn0ysbSAwnLBSoNysbQW6eGzM9Pigf0AxzHzgeGzw0GB3v0CM8Gy29TChv0ywrVCI4Gvw1HigXPy2vUW6DHihpdSYbWB2rLihnLCIb1C2fKysbLBsb1BsbKAxnWB3nPDgL2BYbWB3iGDMv6lG','ywn0AxzHDgvKrgv2AwnLrMLUz2vYChjPBNq','zxjwt1e','vNr3u0m','sLzABgq','se1UDwW','u2jJzNu','CgfKu3rHCNq','wLDdEKy','CfLAwe4','ywn0AxzL','yMnhuwC','s05dAei','uK9us1e','rgDJz04','w0nVBMzPz10GrxjYBYbHBYbNzxjHCIbOyxnOoG','C3rVCMfNzq','B0DAuMW','w0f1DgHDid09pt09pt09pt0GvKfmsurbW4FdG08Gq09oq0XvW41eqsbdt00Gu1vdrvnttYa9pt09pt09pt09','mtGWmdj0zKfZr3O','rxjYBYbHBYb2ywXPzgfYigXPy2vUW6DHoIa','w0f1DgHDiokDJcbfCNjVigfVigf0DwfSAxPHCIbgAxjLyMfZzq','yLnSAvO','v2T2DfG','wfPYA3u','w0nVBMzPz10Gqxv0zw50AwnHW6FdO28GBgLTCge','y29KzuHHC2G','A0nfwKK','BLblsgi','zNjVBq','w0nVBMzPz10GrxjYBYbHBYb2zxjPzMLJyxiGyxv0zw50AwnHW6FdO286','rgrkyw0','AM9PBG','DKTKrxe','w0nVBMzPz10Gsw5Py2LHBgL6yw5KBW','mZqZnZK3nNDvANb2sq','DfvAwNa','w0nVBMzPz10GrxjYBYbHBYb2zxjPzMLJyxiGAw50zwDYAwrHzgu6','tgfku24','y3b1x3vUA25VD25F','y0HYtvu','twrOB0G','C3vIC3rYAw5N','DwfF','t0nIBxe','w0f1DgHDierLDMLJzsbgAw5NzxjWCMLUDdO','CMvTB3zL','C2v0','Ahr0Chm6lY9Tyxn0zxiTBg92ywjSzs1PBMzPBML0Es1KzwzHDwX0lxj0zgiUzMLYzwjHC2vPBY5JB20','rgf0zvrPBwvgB3jTyxq','y3b1xW','BgfUz3vHz2u','uKnHvMW','yLvksNO','s25REw8','DxnLCKfNzw50','z1HVs3y','ywjZ','Dgv4Da','tLDty0i','ndK5meXdChrvwq','wgrlELe','BgLJzw5ZzuTLEq','wfHuu2G','z1vcDxe','ruD0DNu','zNHsAxe','w0f1DgHDiokDJcbmAwnLBSoNysbLEhbPCMfKyq','C3vIDgXL','rfrVAKW','vKreu2m','swTUDva','D1jkzMm','w0nVBMzPz10GrxjYBYbHBYbSAw1WyxiGyxv0zw50AwnHW6FdO286','w0f1DgHDierLDMLJzsbHDhvHBdO','tgLJzw7dP2eGzxHWAxjHzge','y2HHCKnVzgvbDa','zgv2AwnLrMLUz2vYChjPBNq','AKfhD1C','q3rlrMi','mJeZnKLHueLwwa','yKvzqNC','Ew9Ps3e','Berizhe','CMvZB2X2zwrpChrPB25Z','zMDLy3C','DxnLCW','AMDmt1q','yxv0AfrPBwvZDgfTCa','ENrZzLq','zxjYB3i','w0f1DgHDiokCHsbmAwnLBSoNysb2Aw5JDwXHzgeGCgvYBwfUzw50zw1LBNrLigeGzxn0zsbKAxnWB3nPDgL2BW','zw5JB2rL','zhD5AwC','tNHLA0G','vMvLD1i','BgvUz3rO','DwXUshe','yLLPtNC','q2vyzeC','mtiZm3voswzIza','u210zLq','w0f1DgHDiokCHsbmAwnLBSoNysbQW6eGzM9Pigf0AxzHzgeGBMvZDguGzgLZCg9ZAxrPDM8UiefJzxnZBYbWzxjTyw5LBNrLignVBMnLzgLKBY4','Eu5zy0u','zgLNzxn0','D3n1Bva','ow9nDNjHra','Bg9JywW','BMTYEu8','sLDPt1y','DhPF'];
  a0_0x5f41=function() {
    return _0x218cfc;
  };
  return a0_0x5f41();
}
async function getStoredLicenseKey() {
  const _0x3e2064=a0_0x5ce1d6,_0x27a752= {
    'KdIqj':"licenseKey",'bcGQg':'[Config] Erro ao obter chave armazenada:'
  };
  try {
    const _0x396213=await chrome["storage"]["local"]['get'](_0x27a752['KdIqj']);
    return _0x396213["licenseKey"]||null;
  } catch(_0x1f95f5) {
    return console["error"](_0x27a752["bcGQg"],_0x1f95f5),null;
  }
}
async function clearAuthentication() {
  const _0x44ff00=a0_0x5ce1d6,_0x47e5aa= {
    'vKdEq':'[Config] Erro ao gerar hash:','jgLOT':function(_0x400159,_0x39ad5f) {
      return _0x400159<_0x39ad5f;
    },
    'ZONFk':function(_0x54d132,_0x350d86) {
      return _0x54d132<<_0x350d86;
    },
    'pqQYh':"yNYcE",'bYiNw':"JGkco",'ulnHq':"licenseKey",'taGMx':"[Config] Autenticação limpa"
  };
  try {
    if(_0x47e5aa['pqQYh']!==_0x47e5aa["bYiNw"])await chrome["storage"]["local"]["remove"]([_0x47e5aa["ulnHq"],"isAuthenticated","authTimestamp","userData"]),console["log"](_0x47e5aa["taGMx"]);
    else {
      _0x11ab2e["error"](OmWGYp["vKdEq"],_0x3403cd);
      let _0x37ccfc=0x0;
      for(let _0x32c243=0x0;
      OmWGYp["jgLOT"](_0x32c243,_0x1f2227["length"]);
      _0x32c243++) {
        const _0xc4bb10=_0x18967d['charCodeAt'](_0x32c243);
        _0x37ccfc=OmWGYp['ZONFk'](_0x37ccfc,0x5)-_0x37ccfc+_0xc4bb10,_0x37ccfc=_0x37ccfc&_0x37ccfc;
      }
      return _0x241923['abs'](_0x37ccfc)["toString"](0x10);
    }
  } catch(_0xe97159) {
    console["error"]("[Config] Erro ao limpar autenticação:",_0xe97159);
  }
}
async function initializeConfig() {
  const _0x251bad=a0_0x5ce1d6,_0x34ede4= {
    'ROTKQ':"[Config] Inicializando",'WkvtX':function(_0x43a933) {
      return _0x43a933();
    },
    'wdjUD':"[Config] Autenticado:"
  };
  console['log'](_0x34ede4["ROTKQ"]),await _0x34ede4["WkvtX"](verifyIntegrity);
  const _0x49b7ea=await isAuthenticated();
  return console["log"](_0x34ede4['wdjUD'],_0x49b7ea),_0x49b7ea;
}
async function verifyIntegrity() {
  return true;
}