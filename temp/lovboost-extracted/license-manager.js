const a0_0x28fc77=a0_0x23a0;
(function(_0x2404d0,_0x21c06d) {
  const _0x5ee748=a0_0x23a0,_0x46f2a6=_0x2404d0();
  while(true) {
    try {
      const _0x4ea5ce=-parseInt("713144zASmyS")/0x1+parseInt("32218SNeSaa")/0x2*(-parseInt("186tbXsaF")/0x3)+-parseInt("2579516zGbxxw")/0x4+-parseInt("1628885RpnJNi")/0x5+-parseInt("3228354bgVyoo")/0x6+-parseInt("7000000jiddqg")/0x7+parseInt("40692416mlGGGF")/0x8;
      if(_0x4ea5ce===_0x21c06d)break;
      else _0x46f2a6['push'](_0x46f2a6['shift']());
    } catch(_0x1b4598) {
      _0x46f2a6['push'](_0x46f2a6['shift']());
    }
  }
}
(a0_0xea07,0xd368f));
class LicenseManager {
  constructor() {
    const _0x4d5857=a0_0x23a0;
    this['STORAGE_KEY']='lovboost_licenses',this["ADMIN_KEY"]="lovboost_admin_password",this["licenses"]=[],this['initialized']=false;
  }
  async["init"]() {
    const _0x208cf4=a0_0x28fc77,_0x55cc55= {
      'pieQO':function(_0x35b56e) {
        return _0x35b56e();
      }
    };
    if(this["initialized"])return;
    return new Promise(_0x477a20=> {
      const _0x5cbd71=_0x208cf4;
      chrome[_0x5cbd71(0x1a7)]['local'][_0x5cbd71(0x223)]([this[_0x5cbd71(0x1b9)]],_0x186767=> {
        const _0x20d94a=_0x5cbd71;
        _0x186767[this[_0x20d94a(0x1b9)]]?this[_0x20d94a(0x1ce)]=_0x186767[this[_0x20d94a(0x1b9)]]:this[_0x20d94a(0x1ce)]=[],this[_0x20d94a(0x180)]=true,_0x55cc55[_0x20d94a(0x1c3)](_0x477a20);
      }
      );
    }
    );
  }
  async["loadLicenses"]() {
    const _0xb61a12= {
      'ZnHEN':'wOHKn'
    };
    return new Promise(_0x485e39=> {
      const _0x2fc735=a0_0x23a0,_0x289770= {
        'Bhsgx':function(_0x108566,_0x3dec8c) {
          return _0x108566===_0x3dec8c;
        },
        'MsPxP':_0xb61a12["ZnHEN"],'PioRy':function(_0x26c5c5,_0x2ef8ac) {
          return _0x26c5c5(_0x2ef8ac);
        }
      };
      chrome['storage']["local"]["get"]([this["STORAGE_KEY"]],_0x4e6c47=> {
        const _0x3e00b7=_0x2fc735;
        _0x289770[_0x3e00b7(0x216)]('kyHto',_0x289770[_0x3e00b7(0x1bf)])?this['licenses']=_0x13686b[this[_0x3e00b7(0x1b9)]]:(_0x4e6c47[this[_0x3e00b7(0x1b9)]]?this[_0x3e00b7(0x1ce)]=_0x4e6c47[this[_0x3e00b7(0x1b9)]]:this[_0x3e00b7(0x1ce)]=[],_0x289770[_0x3e00b7(0x19b)](_0x485e39,this[_0x3e00b7(0x1ce)]));
      }
      );
    }
    );
  }
  async["saveLicenses"]() {
    const _0x16e5dc=a0_0x28fc77,_0x340db7= {
      'YzJCq':function(_0x281740) {
        return _0x281740();
      },
      'dGkVH':function(_0x1c7315,_0x82b9eb) {
        return _0x1c7315===_0x82b9eb;
      },
      'tWxUB':"OhRcP"
    };
    return new Promise(_0xa29f33=> {
      const _0x4bc175=_0x16e5dc;
      if(_0x340db7['dGkVH'](_0x340db7[_0x4bc175(0x1a8)],_0x340db7['tWxUB']))chrome[_0x4bc175(0x1a7)][_0x4bc175(0x1da)]['set']( {
        [this[_0x4bc175(0x1b9)]]:this[_0x4bc175(0x1ce)]
      },
      ()=> {
        const _0xba0b0=_0x4bc175;
        _0x340db7[_0xba0b0(0x1f5)](_0xa29f33);
      }
      );
      else return this[_0x4bc175(0x1b3)](_0x2db0d7, {
        'active':true
      }
      );
    }
    );
  }
  async["generateLicense"](_0x1d946c=0x1e,_0x31656f=null,_0x497325='',_0x3e26d9='') {
    const _0x406262=a0_0x28fc77,_0x30fe5c= {
      'SFhEt':"Licença não encontrada",'Kfefb':function(_0x1ef76e) {
        return _0x1ef76e();
      },
      'RBksK':function(_0x2eaf42,_0xc9f5ee) {
        return _0x2eaf42||_0xc9f5ee;
      },
      'tlMDz':"Sem telefone",'jRGjf':"undefined",'hlDzp':function(_0x76e4f3,_0x2e70d5) {
        return _0x76e4f3===_0x2e70d5;
      },
      'nougC':"gbaYX",'CUWGB':'vzvlb','OLuGr':function(_0x3185fb,_0x1c3230) {
        return _0x3185fb(_0x1c3230);
      }
    },
    _0x409c21=()=> {
      const _0x3df8f6=_0x406262;
      return Math['random']()[_0x3df8f6(0x173)](0x24)[_0x3df8f6(0x176)](0x2,0xa)[_0x3df8f6(0x1d6)]();
    },
    _0x261514="LOV-"+_0x30fe5c['Kfefb'](_0x409c21)+'-'+_0x30fe5c["Kfefb"](_0x409c21)+'-'+_0x30fe5c['Kfefb'](_0x409c21),_0x3b6317= {
      'key':_0x261514,'created':new Date()["toISOString"](),'activated':false,'activatedDate':null,'activatedDevices':[],'expiryDate':this['getExpiryDate'](_0x1d946c),'active':true,'uses':0x0,'maxUses':_0x31656f,'description':'','userName':_0x497325||"Sem nome",'userPhone':_0x30fe5c["RBksK"](_0x3e26d9,_0x30fe5c["tlMDz"])
    };
    this["licenses"]['push'](_0x3b6317),await this['saveLicenses']();
    if(typeof saveLicenseToCloud!==_0x30fe5c["jRGjf"]) {
      if(_0x30fe5c['hlDzp'](_0x30fe5c["nougC"],_0x30fe5c["CUWGB"]))return {
        'success':false,'message':_0x30fe5c['SFhEt']
      };
      else await _0x30fe5c["OLuGr"](saveLicenseToCloud,_0x3b6317);
    }
    return _0x3b6317;
  }
  ['getExpiryDate'](_0x79e206) {
    const _0x4a7dc1=a0_0x28fc77,_0xedd6ce= {
      'xeelJ':function(_0x57b76a,_0x31cc35) {
        return _0x57b76a+_0x31cc35;
      }
    },
    _0x13a0c1=new Date();
    return _0x13a0c1["setDate"](_0xedd6ce["xeelJ"](_0x13a0c1['getDate'](),_0x79e206)),_0x13a0c1["toISOString"]();
  }
  async["validateLicense"](_0x29eb5b) {
    const _0x2325ac=a0_0x28fc77,_0x127c0b= {
      'KOcPb':'[Admin] Erro ao sincronizar senha:','HvalM':'Licenca desativada','LqYYd':function(_0x3f8841,_0x2393c5) {
        return _0x3f8841+_0x2393c5;
      },
      'yFmhe':function(_0xc9b736,_0xc5f34e) {
        return _0xc9b736-_0xc5f34e;
      },
      'zDLKh':function(_0x1e63b8,_0x2d248e) {
        return _0x1e63b8<<_0x2d248e;
      },
      'nxlHA':function(_0xef58a1,_0x4af4b6) {
        return _0xef58a1&_0x4af4b6;
      },
      'LaUHs':function(_0x9e284b,_0x8c39fa) {
        return _0x9e284b<_0x8c39fa;
      },
      'mZDUZ':function(_0x1ee5ec,_0x2d4535) {
        return _0x1ee5ec+_0x2d4535;
      },
      'MFVoE':function(_0x3d7135,_0x157e22) {
        return _0x3d7135-_0x157e22;
      },
      'gGfEd':function(_0x5dd3f5,_0x5ab882) {
        return _0x5dd3f5&_0x5ab882;
      },
      'IgAyr':'hash_','PMaKx':"Licenca nao encontrada",'IxJvw':function(_0x34d637,_0x4ebb5c) {
        return _0x34d637!==_0x4ebb5c;
      },
      'HELxk':"undefined",'RNjiF':"BymHO",'HinwR':function(_0x52c968,_0x462d9b) {
        return _0x52c968>_0x462d9b;
      },
      'igvYs':'Licenca expirada','zmldN':function(_0x4e5933,_0x221f6d) {
        return _0x4e5933>=_0x221f6d;
      },
      'QlVZj':'GBbVV','kBlEH':"BwTXO",'LiwJW':"Limite de usos atingido",'sjRFy':'Licenca valida (nuvem)','Qhhwo':'BRUOF','jscxb':"Erro ao validar na nuvem, tentando localmente:",'MhiuT':function(_0x209bec,_0x370174) {
        return _0x209bec!==_0x370174;
      },
      'crqdM':"kkYoK",'xKKLz':function(_0x2d74e5,_0x2c1507) {
        return _0x2d74e5===_0x2c1507;
      },
      'XiFut':"ZFjEd"
    };
    if(_0x127c0b["IxJvw"](typeof getLicenseFromCloud,_0x127c0b['HELxk']))try {
      const _0x58b420=await getLicenseFromCloud(_0x29eb5b);
      if(_0x58b420) {
        if(_0x127c0b["RNjiF"]==='BymHO') {
          if(!_0x58b420["active"])return {
            'valid':false,'message':"Licenca desativada"
          };
          const _0x3663fc=new Date(),_0x367f79=new Date(_0x58b420["expiryDate"]);
          if(_0x127c0b["HinwR"](_0x3663fc,_0x367f79))return {
            'valid':false,'message':_0x127c0b['igvYs']
          };
          if(_0x58b420["maxUses"]&&_0x127c0b['zmldN'](_0x58b420["uses"],_0x58b420['maxUses'])) {
            if(_0x127c0b["IxJvw"](_0x127c0b["QlVZj"],_0x127c0b["kBlEH"]))return {
              'valid':false,'message':_0x127c0b['LiwJW']
            };
            else _0x468f5a['error'](_0x127c0b["KOcPb"],_0x37839e);
          }
          return {
            'valid':true,'message':_0x127c0b["sjRFy"],'license':_0x58b420
          };
        } else return {
          'valid':false,'message':_0x127c0b["HvalM"]
        };
      }
    } catch(_0x60edf) {
      if("BRUOF"===_0x127c0b["Qhhwo"])console["warn"](_0x127c0b["jscxb"],_0x60edf);
      else {
        const _0x39aeda=_0xb05858["charCodeAt"](_0x3c71d6);
        _0xb7700e=_0x127c0b["LqYYd"](_0x127c0b["yFmhe"](_0x127c0b['zDLKh'](_0x422dad,0x5),_0x48326e),_0x39aeda),_0x1a679b=_0x127c0b["nxlHA"](_0x3bf7b4,_0x5af4fa);
      }
    }
    await this["loadLicenses"]();
    const _0x24dce=this["licenses"]['find'](_0x596293=>_0x596293["key"]===_0x29eb5b);
    if(!_0x24dce) {
      if(_0x127c0b["MhiuT"]("EPEKX",'xUFje'))return {
        'valid':false,'message':_0x127c0b['PMaKx']
      };
      else {
        let _0x200e59=0x0;
        for(let _0xe984ce=0x0;
        _0x127c0b["LaUHs"](_0xe984ce,_0xd3c6e["length"]);
        _0xe984ce++) {
          const _0x164d27=_0x47cd77["charCodeAt"](_0xe984ce);
          _0x200e59=_0x127c0b["mZDUZ"](_0x127c0b["MFVoE"](_0x200e59<<0x5,_0x200e59),_0x164d27),_0x200e59=_0x127c0b['gGfEd'](_0x200e59,_0x200e59);
        }
        return _0x127c0b["IgAyr"]+_0x47c310["abs"](_0x200e59)['toString'](0x10);
      }
    }
    if(!_0x24dce['active']) {
      if(_0x127c0b["crqdM"]!=="kkYoK")_0x1b48e7[this["STORAGE_KEY"]]?this["licenses"]=_0x538ebb[this["STORAGE_KEY"]]:this["licenses"]=[],_0x2bddd6(this["licenses"]);
      else return {
        'valid':false,'message':_0x127c0b['HvalM']
      };
    }
    const _0x147fc4=new Date(),_0x5379ac=new Date(_0x24dce["expiryDate"]);
    if(_0x127c0b["HinwR"](_0x147fc4,_0x5379ac))return _0x127c0b["xKKLz"]('ZFjEd',_0x127c0b["XiFut"])? {
      'valid':false,'message':_0x127c0b["igvYs"]
    }
    : {
      'valid':false,'message':_0x127c0b['PMaKx']
    };
    if(_0x24dce["maxUses"]&&_0x127c0b["zmldN"](_0x24dce["uses"],_0x24dce["maxUses"]))return {
      'valid':false,'message':_0x127c0b["LiwJW"]
    };
    return {
      'valid':true,'message':"Licenca valida (local)",'license':_0x24dce
    };
  }
  async['activateLicense'](_0x30adf8,_0x1befb3) {
    const _0x3a0681=a0_0x28fc77,_0x27c5bb= {
      'fDxPR':function(_0x307da9) {
        return _0x307da9();
      },
      'dNjUl':"Licença não encontrada",'ZkyZc':function(_0x1733e2,_0x2e2b58) {
        return _0x1733e2+_0x2e2b58;
      },
      'rzbeh':function(_0x36a859,_0x32fe9a) {
        return _0x36a859===_0x32fe9a;
      },
      'OfNiU':"qWyaM"
    };
    await this['loadLicenses']();
    const _0x4ea565=this["licenses"]["find"](_0x8ad394=>_0x8ad394["key"]===_0x30adf8);
    if(!_0x4ea565)return {
      'success':false,'message':_0x27c5bb["dNjUl"]
    };
    return _0x4ea565['activated']=true,_0x4ea565["activatedDate"]=new Date()["toISOString"](),_0x4ea565["uses"]=_0x27c5bb["ZkyZc"](_0x4ea565["uses"]||0x0,0x1),!_0x4ea565['activatedDevices']&&(_0x27c5bb['rzbeh'](_0x27c5bb["OfNiU"],"qWyaM")?_0x4ea565['activatedDevices']=[]:(_0x28edfc[this["STORAGE_KEY"]]?this["licenses"]=_0x1e2089[this["STORAGE_KEY"]]:this['licenses']=[],this['initialized']=true,quFsnt['fDxPR'](_0x19c39f))),!_0x4ea565["activatedDevices"]["includes"](_0x1befb3)&&_0x4ea565["activatedDevices"]["push"](_0x1befb3),await this['saveLicenses'](), {
      'success':true,'message':"Licença ativada com sucesso",'license':_0x4ea565
    };
  }
  async["getAllLicenses"]() {
    const _0x55f023=a0_0x28fc77;
    return await this["loadLicenses"](),this["licenses"];
  }
  async['deleteLicense'](_0x4c0c2c) {
    const _0x11a679=a0_0x28fc77,_0x21b2f1= {
      'LPEva':function(_0x48b963,_0x55b624) {
        return _0x48b963>_0x55b624;
      },
      'DYdpB':function(_0x1d5e36,_0x1bce3c) {
        return _0x1d5e36!==_0x1bce3c;
      },
      'gVMMD':"undefined",'eFNwy':function(_0x2184d9,_0x59921b) {
        return _0x2184d9===_0x59921b;
      },
      'jEXEM':'NoEfz','uUyGz':function(_0x36decd,_0x41bfdf) {
        return _0x36decd(_0x41bfdf);
      },
      'bthPq':"[LicenseManager] Licença deletada do Firebase:",'DMizi':"[LicenseManager] Erro ao deletar do Firebase:",'ZeJCd':"Licença não encontrada"
    };
    await this["loadLicenses"]();
    const _0x54e5fc=this['licenses']["findIndex"](_0x553788=>_0x553788['key']===_0x4c0c2c);
    if(_0x21b2f1["LPEva"](_0x54e5fc,-0x1)) {
      this["licenses"]['splice'](_0x54e5fc,0x1),await this['saveLicenses']();
      if(_0x21b2f1["DYdpB"](typeof deleteLicenseFromCloud,_0x21b2f1['gVMMD']))try {
        if(_0x21b2f1["eFNwy"](_0x21b2f1['jEXEM'],_0x21b2f1["jEXEM"]))await _0x21b2f1["uUyGz"](deleteLicenseFromCloud,_0x4c0c2c),console['log'](_0x21b2f1['bthPq'],_0x4c0c2c);
        else {
          const _0x5cd29b= {
            'aYzWq':function(_0xff6d2,_0x517094) {
              return _0xff6d2(_0x517094);
            }
          };
          _0x104818["storage"]["local"]['get']([this["STORAGE_KEY"]],_0x560891=> {
            const _0x41c1d4=_0x11a679;
            _0x560891[this[_0x41c1d4(0x1b9)]]?this['licenses']=_0x560891[this[_0x41c1d4(0x1b9)]]:this[_0x41c1d4(0x1ce)]=[],_0x5cd29b['aYzWq'](_0x58660c,this[_0x41c1d4(0x1ce)]);
          }
          );
        }
      } catch(_0x68daf) {
        console['error'](_0x21b2f1["DMizi"],_0x68daf);
      }
      return {
        'success':true,'message':"Licença deletada com sucesso"
      };
    }
    return {
      'success':false,'message':_0x21b2f1['ZeJCd']
    };
  }
  async["editLicense"](_0x2a8f46,_0x560bb0) {
    const _0x21b6a8=a0_0x28fc77,_0xc5b683= {
      'NEipj':'Licença não encontrada','HpMYJ':"Licença atualizada"
    };
    await this["loadLicenses"]();
    const _0xb5e9c1=this["licenses"]["find"](_0xd02bef=>_0xd02bef["key"]===_0x2a8f46);
    if(!_0xb5e9c1)return {
      'success':false,'message':_0xc5b683['NEipj']
    };
    return Object['assign'](_0xb5e9c1,_0x560bb0),await this['saveLicenses'](), {
      'success':true,'message':_0xc5b683["HpMYJ"],'license':_0xb5e9c1
    };
  }
  async["deactivateLicense"](_0x45b5d7) {
    const _0x2d1fde=a0_0x28fc77;
    return this["editLicense"](_0x45b5d7, {
      'active':false
    }
    );
  }
  async["reactivateLicense"](_0x355490) {
    const _0x1b2ab9=a0_0x28fc77;
    return this["editLicense"](_0x355490, {
      'active':true
    }
    );
  }
  async["setAdminPassword"](_0x24a7b9) {
    const _0x2487ff=a0_0x28fc77,_0x4a0c0a= {
      'egwHu':function(_0x5d9ae7,_0x148572) {
        return _0x5d9ae7===_0x148572;
      },
      'cnqQD':"iFWkA",'lTBNx':"eHKpK",'AVxkG':function(_0x9409b7,_0x117fc0) {
        return _0x9409b7(_0x117fc0);
      },
      'gjcke':function(_0x231c2e) {
        return _0x231c2e();
      },
      'xEnRt':'Licenca desativada','yzvvV':function(_0x1a7888,_0x55498a) {
        return _0x1a7888>_0x55498a;
      },
      'oOjoz':function(_0x55e173,_0xd1aecc) {
        return _0x55e173>=_0xd1aecc;
      },
      'HLKAU':'Limite de usos atingido','dRlgo':function(_0x2ddf2f,_0x25ad09) {
        return _0x2ddf2f!==_0x25ad09;
      },
      'kTDkg':"undefined",'sAeWL':"GFqzR",'aMaHt':"slcfd",'tuCNE':'[Admin] Sincronizando senha com Firebase...','zvdza':"[Admin] Senha sincronizada com Firebase:",'qGUBt':function(_0x1c85b5,_0x1ad69b) {
        return _0x1c85b5===_0x1ad69b;
      },
      'JkATj':"DjeEp",'kaFSv':"[Admin] Erro ao sincronizar senha:",'SWnsU':"geTgT",'QTwDt':"[Admin] saveAdminPasswordToCloud nao definida",'tQluv':"Senha de admin definida e sincronizada"
    },
    _0x3e99fa=this["hashPassword"](_0x24a7b9);
    await new Promise(_0x5d641a=> {
      const _0x3b01b1=_0x2487ff;
      _0x4a0c0a[_0x3b01b1(0x18c)](_0x4a0c0a[_0x3b01b1(0x194)],_0x4a0c0a[_0x3b01b1(0x1d5)])?this[_0x3b01b1(0x1ce)]=[]:chrome[_0x3b01b1(0x1a7)]['local'][_0x3b01b1(0x203)]( {
        [this[_0x3b01b1(0x1f1)]]:_0x3e99fa
      },
      _0x5d641a);
    }
    ),console['log']('[Admin] Senha salva localmente');
    if(_0x4a0c0a["dRlgo"](typeof saveAdminPasswordToCloud,_0x4a0c0a['kTDkg'])) {
      if("FQAAF"===_0x4a0c0a["sAeWL"]) {
        _0x4a0c0a['AVxkG'](_0x1603d7,true);
        return;
      } else try {
        if(_0x4a0c0a["dRlgo"](_0x4a0c0a["aMaHt"],_0x4a0c0a["aMaHt"]))_0x3c7c96["storage"]["local"]["set"]( {
          [this["STORAGE_KEY"]]:this['licenses']
        },
        ()=> {
          const _0x2ca2a8=_0x2487ff;
          lOzedQ[_0x2ca2a8(0x171)](_0x562443);
        }
        );
        else {
          console['log'](_0x4a0c0a['tuCNE']);
          const _0x5142c3=await saveAdminPasswordToCloud(_0x3e99fa);
          console["log"](_0x4a0c0a["zvdza"],_0x5142c3);
        }
      } catch(_0x28383f) {
        if(_0x4a0c0a["qGUBt"](_0x4a0c0a["JkATj"],_0x4a0c0a["JkATj"]))console["error"](_0x4a0c0a["kaFSv"],_0x28383f);
        else {
          if(!_0x4e59cc["active"])return {
            'valid':false,'message':lOzedQ['xEnRt']
          };
          const _0x3cb3f2=new _0x5da9b7(),_0x430186=new _0x60ce09(_0x15e9a0["expiryDate"]);
          if(lOzedQ["yzvvV"](_0x3cb3f2,_0x430186))return {
            'valid':false,'message':'Licenca expirada'
          };
          if(_0x31b360["maxUses"]&&lOzedQ['oOjoz'](_0x5120bf["uses"],_0x4b8224["maxUses"]))return {
            'valid':false,'message':lOzedQ["HLKAU"]
          };
          return {
            'valid':true,'message':"Licenca valida (nuvem)",'license':_0x5a3a2e
          };
        }
      }
    } else'HfEqC'===_0x4a0c0a["SWnsU"]?_0x57dfa7["storage"]["local"]["set"]( {
      [this["ADMIN_KEY"]]:_0x4059c8
    },
    _0x3ffc01):console["warn"](_0x4a0c0a['QTwDt']);
    return {
      'success':true,'message':_0x4a0c0a['tQluv']
    };
  }
  async["verifyAdminPassword"](_0x1a738e,_0x4cd74b) {
    const _0x2b05ae=a0_0x28fc77,_0x9bf3ed= {
      'hXomc':"Licenca desativada",'vvKvG':function(_0x3a45e1,_0x2eb94b) {
        return _0x3a45e1>_0x2eb94b;
      },
      'VpdHD':"[LicenseManager] Erro ao deletar do Firebase:",'TJrUk':'Licenca expirada','pakFy':'qaMXn','nmudj':"yYcue",'fSOEJ':function(_0x2fc98b,_0x4444ef) {
        return _0x2fc98b!==_0x4444ef;
      },
      'xgBKY':"undefined",'ZHwou':"GeVBG",'shFnd':function(_0x35b99a) {
        return _0x35b99a();
      },
      'rrvRY':"rbzJv",'iqJHy':'[Admin] Erro ao carregar senha do Firebase:','nlUZy':function(_0x131fda,_0x35a247) {
        return _0x131fda===_0x35a247;
      },
      'DxsqB':"nPGSB",'KKqIO':function(_0x3bcc70,_0x239948) {
        return _0x3bcc70(_0x239948);
      }
    };
    chrome['storage']['local']["get"]([this['ADMIN_KEY']],async _0x20feab=> {
      const _0x394bab=_0x2b05ae,_0x306d01= {
        'xgIYp':_0x9bf3ed[_0x394bab(0x1d3)]
      };
      if(_0x9bf3ed[_0x394bab(0x166)]===_0x9bf3ed[_0x394bab(0x1a0)])return {
        'valid':false,'message':VRKwZv[_0x394bab(0x201)]
      };
      else {
        let _0x6299d5=_0x20feab[this[_0x394bab(0x1f1)]];
        if(!_0x6299d5&&_0x9bf3ed[_0x394bab(0x184)](typeof getAdminPasswordFromCloud,_0x9bf3ed[_0x394bab(0x1c8)]))try {
          if('GeVBG'!==_0x9bf3ed['ZHwou'])return {
            'valid':false,'message':yJRLBX['hXomc']
          };
          else _0x6299d5=await _0x9bf3ed[_0x394bab(0x167)](getAdminPasswordFromCloud),_0x6299d5&&chrome[_0x394bab(0x1a7)][_0x394bab(0x1da)][_0x394bab(0x203)]( {
            [this[_0x394bab(0x1f1)]]:_0x6299d5
          }
          );
        } catch(_0x3af800) {
          if(_0x9bf3ed['fSOEJ'](_0x9bf3ed[_0x394bab(0x197)],_0x9bf3ed['rrvRY'])) {
            const _0x24b745=new _0x380171(),_0x308376=new _0x4b0b6f(_0x263f16['expiryDate']);
            return _0x9bf3ed[_0x394bab(0x1cc)](_0x24b745,_0x308376);
          } else console['warn'](_0x9bf3ed[_0x394bab(0x1df)],_0x3af800);
        }
        if(!_0x6299d5) {
          if(_0x9bf3ed[_0x394bab(0x178)](_0x394bab(0x1de),_0x9bf3ed[_0x394bab(0x1dd)])) {
            _0x9bf3ed['KKqIO'](_0x4cd74b,true);
            return;
          } else _0x19a460[_0x394bab(0x1dc)](yJRLBX['VpdHD'],_0x1e8a7a);
        }
        const _0x1d8a9a=this[_0x394bab(0x1a9)](_0x1a738e);
        _0x9bf3ed[_0x394bab(0x202)](_0x4cd74b,_0x9bf3ed['nlUZy'](_0x1d8a9a,_0x6299d5));
      }
    }
    );
  }
  ["hashPassword"](_0x21e139) {
    const _0x421c8e=a0_0x28fc77,_0x177543= {
      'BugNs':function(_0x2dcfe7,_0x465977) {
        return _0x2dcfe7<_0x465977;
      },
      'nndid':function(_0x3b8142,_0x247b0b) {
        return _0x3b8142+_0x247b0b;
      },
      'WrknV':function(_0x3c455d,_0xeb8bf2) {
        return _0x3c455d-_0xeb8bf2;
      },
      'KEJUb':function(_0x1b66a5,_0xb695e) {
        return _0x1b66a5<<_0xb695e;
      },
      'alxUk':"hash_"
    };
    let _0xb5ab0=0x0;
    for(let _0x53bd8d=0x0;
    _0x177543['BugNs'](_0x53bd8d,_0x21e139["length"]);
    _0x53bd8d++) {
      const _0x14cf39=_0x21e139['charCodeAt'](_0x53bd8d);
      _0xb5ab0=_0x177543['nndid'](_0x177543['WrknV'](_0x177543["KEJUb"](_0xb5ab0,0x5),_0xb5ab0),_0x14cf39),_0xb5ab0=_0xb5ab0&_0xb5ab0;
    }
    return _0x177543['nndid'](_0x177543["alxUk"],Math["abs"](_0xb5ab0)["toString"](0x10));
  }
  async["exportLicenses"]() {
    const _0x468434=a0_0x28fc77;
    return await this["loadLicenses"](),JSON["stringify"](this["licenses"],null,0x2);
  }
  async["importLicenses"](_0x4c5774) {
    const _0x5af0c5=a0_0x28fc77,_0x757b76= {
      'hFagb':function(_0x313601,_0xc3fb16) {
        return _0x313601!==_0xc3fb16;
      },
      'iZphe':"TOiDl",'puIza':"Licenças importadas com sucesso",'rNFmd':"Formato inválido",'VFbGk':"HkHkk",'uxBSQ':"zBKxU",'PZJHG':function(_0x72852b,_0x24c5e2) {
        return _0x72852b+_0x24c5e2;
      }
    };
    try {
      if(_0x757b76['hFagb'](_0x757b76["iZphe"],"hZMQS")) {
        const _0x3b1f2d=JSON["parse"](_0x4c5774);
        if(Array["isArray"](_0x3b1f2d))return this["licenses"]=_0x3b1f2d,await this["saveLicenses"](), {
          'success':true,'message':_0x757b76['puIza']
        };
        return {
          'success':false,'message':_0x757b76["rNFmd"]
        };
      } else this["licenses"]=[];
    } catch(_0xe51b97) {
      if(_0x757b76["VFbGk"]===_0x757b76['uxBSQ'])_0xd8f324["warn"]('Erro ao validar na nuvem, tentando localmente:',_0xc25a92);
      else return {
        'success':false,'message':_0x757b76['PZJHG']("Erro ao importar: ",_0xe51b97["message"])
      };
    }
  }
  async["getStats"]() {
    const _0x26c58d=a0_0x28fc77,_0x1fc056= {
      'CbflK':function(_0x3eee7d,_0x419861) {
        return _0x3eee7d>_0x419861;
      }
    };
    await this["loadLicenses"]();
    const _0x428028=this['licenses']['length'],_0x4c86a4=this["licenses"]["filter"](_0x2a319b=>_0x2a319b["active"])['length'],_0x5def82=this["licenses"]['filter'](_0x543637=>_0x543637['activated'])["length"],_0x7f451c=this["licenses"]["filter"](_0x325bae=> {
      const _0x582f14=_0x26c58d,_0x41f2f5=new Date(),_0x15553a=new Date(_0x325bae[_0x582f14(0x207)]);
      return _0x1fc056[_0x582f14(0x190)](_0x41f2f5,_0x15553a);
    }
    )["length"];
    return {
      'total':_0x428028,'active':_0x4c86a4,'activated':_0x5def82,'expired':_0x7f451c,'available':_0x4c86a4-_0x7f451c
    };
  }
  async["getLicenseInfo"](_0x3a4aeb) {
    const _0x4f0126=a0_0x28fc77,_0x555a74= {
      'TeYJf':function(_0x130ca0,_0x2b97bd) {
        return _0x130ca0||_0x2b97bd;
      }
    };
    await this['loadLicenses']();
    const _0x389335=this['licenses']["find"](_0x161743=>_0x161743['key']===_0x3a4aeb);
    return _0x555a74["TeYJf"](_0x389335,null);
  }
  async["clearAllLicenses"]() {
    const _0x57de8b=a0_0x28fc77;
    return this["licenses"]=[],await this["saveLicenses"](), {
      'success':true,'message':"Todas as licenças foram deletadas"
    };
  }
}
function a0_0x23a0(_0x25e2b5,_0x16a588) {
  _0x25e2b5=_0x25e2b5-0x166;
  const _0xea071e=a0_0xea07();
  let _0x23a01b=_0xea071e[_0x25e2b5];
  if(a0_0x23a0['JtBxmp']===undefined) {
    var _0x46b670=function(_0x2390c3) {
      const _0x59e02a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
      let _0x33fbd5='',_0x47662e='';
      for(let _0x50e8f8=0x0,_0x2b95c8,_0x1764c4,_0x5799f9=0x0;
      _0x1764c4=_0x2390c3['charAt'](_0x5799f9++);
      ~_0x1764c4&&(_0x2b95c8=_0x50e8f8%0x4?_0x2b95c8*0x40+_0x1764c4:_0x1764c4,_0x50e8f8++%0x4)?_0x33fbd5+=String['fromCharCode'](0xff&_0x2b95c8>>(-0x2*_0x50e8f8&0x6)):0x0) {
        _0x1764c4=_0x59e02a['indexOf'](_0x1764c4);
      }
      for(let _0x137359=0x0,_0x2c0eb9=_0x33fbd5['length'];
      _0x137359<_0x2c0eb9;
      _0x137359++) {
        _0x47662e+='%'+('00'+_0x33fbd5['charCodeAt'](_0x137359)['toString'](0x10))['slice'](-0x2);
      }
      return decodeURIComponent(_0x47662e);
    };
    a0_0x23a0['umByPW']=_0x46b670,a0_0x23a0['hsYMMc']= {
    },
    a0_0x23a0['JtBxmp']=true;
  }
  const _0x493933=_0xea071e[0x0],_0x4384a3=_0x25e2b5+_0x493933,_0x137d87=a0_0x23a0['hsYMMc'][_0x4384a3];
  return!_0x137d87?(_0x23a01b=a0_0x23a0['umByPW'](_0x23a01b),a0_0x23a0['hsYMMc'][_0x4384a3]=_0x23a01b):_0x23a01b=_0x137d87,_0x23a01b;
}
const licenseManager=new LicenseManager();
licenseManager["init"]();
function a0_0xea07() {
  const _0x5e3cd7=['CMj6sNy','swDbExi','s09Jugi','ze5QvwW','Bg9HzeXPy2vUC2vZ','tgfvshm','uwHOD28','tgLJzw7dP2eGzgvSzxrHzgeGy29Tihn1y2vZC28','tfbfDMe','zfjSz28','ALjhAMy','r2vwqKC','Bg9N','zMLUzeLUzgv4','BNHSsee','z2v0u3rHDhm','DMfSAwrHDgvmAwnLBNnL','qurnsu5Fs0vz','tuzwB0u','uwXwwMO','C2f2zuXPy2vUC2vZ','wxPkq3e','sgLUD1i','DxnLCW','EKjlEfu','t2Hsy1a','BvPevvO','CuDvqNq','EeTlthO','A2TzB0S','rvbfs1G','mtG2DgjyC2fg','tgLJzw7dP2eGBSoJBYbLBMnVBNrYywrH','EgDjwxa','s0TXsu8','C2v0','CMvHy3rPDMf0zuXPy2vUC2u','vKzIr2S','zMLUza','zxHWAxj5rgf0zq','mZiYmtHttMvtywe','AvPWAgu','Aw1WB3j0tgLJzw5Zzxm','mtyYodG4nvjWBKPoAq','zgvHy3rPDMf0zuXPy2vUC2u','z2jHwvG','EuzTAgu','rM9YBwf0BYbPBNBdOwXPzg8','AwD2wxm','CK5gBwq','nZeZmtq0EKftBxLt','BgvUz3rO','shbnwuO','u2vUAgeGzguGywrTAw4GzgvMAw5PzgeGzsbZAw5JCM9UAxPHzge','qMHZz3G','shzHBe0','D2fYBG','ywn0AxzHDgvKrgv2AwnLCW','y2XLyxjbBgXmAwnLBNnLCW','Dw5KzwzPBMvK','ExP2DLy','C3rYAw5NAwz5','rxjYBYbHBYb2ywXPzgfYig5Hig51DMvTlcb0zw50yw5KBYbSB2nHBg1LBNrLoG','qLjvt0y','t2zoAvu','te9wlq','C2v0qwrTAw5qyxnZD29Yza','z2v0','wMT5wMm','twHPDvq','uKjRC0S','CgfRrNK','C2HgBMq','EgvLBeO','A2v5','rfLKCei','AuzxA0e','ChvZAa','s0vkvwi','mJu3otuXnNPhyNH4DW','w0fKBwLUxsbZyxzLqwrTAw5qyxnZD29YzfrVq2XVDwqGBMfVigrLzMLUAwrH','ywX4vwS','z2PJA2u','z2vuz1q','Dg9tDhjPBMC','C2v0rgf0zq','sMTbvgO','C3vIC3rYAw5N','AKvyru0','BMXvwNK','seXlqvu','Aw5PDa','Bwf4vxnLCW','EM1Sze4','z2v0tgLJzw5ZzuLUzM8','CgfYC2u','w0fKBwLUxsbfCNjVigfVihnPBMnYB25PEMfYihnLBMHHoG','Aw5PDgLHBgL6zwq','ywn0AxzHDgvKrgf0zq','s2zLzMi','DgXnrhO','zLnpruO','re1PEMK','wKzQrwq','sxHkDNC','C0fLv0W','AfPnuvm','Bg92yM9VC3rFywrTAw5FCgfZC3DVCMq','thfzwwq','zwD3shu','AgfZAf8','sgTiA2S','w0XPy2vUC2vnyw5Hz2vYxsbfCNjVigfVigrLBgv0yxiGzg8GrMLYzwjHC2u6','q2jMBeS','tgLJzw5JysbUyw8Gzw5JB250CMfKyq','tgLJzw5JysbKzxnHDgL2ywrH','ywn0AxzL','y25Xuuq','ve9PrgW','A0jSruG','CNj2uLK','u2vTig5VBwu','zuzoD3K','qNDuwe8','ugLVuNK','w0XPy2vUC2vnyw5Hz2vYxsbmAwnLBSoNysbKzwXLDgfKysbKBYbgAxjLyMfZztO','CvD5yu0','zxHWB3j0tgLJzw5Zzxm','tgLTAxrLigrLihvZB3mGyxrPBMDPzg8','BM11zgO','A2fgu3y','zMLSDgvY','r0zXELi','z2vUzxjHDgvmAwnLBNnL','tgLJzw7dP2eGyxrPDMfKysbJB20GC3vJzxnZBW','nda2oti0mtzTBeDhr0y','C3rVCMfNzq','DfD4vui','AgfZAfbHC3n3B3jK','C2PsrNK','u1DUC1u','q1vxr0i','mZiYodm1ngjNvNLVBW','rxjYBYbHBYbPBxbVCNrHCJOG','tgLJzw7dP2eGyxr1ywXPEMfKyq','Aw5JBhvKzxm','rLfbquy','zuHlCeS','zwrPDeXPy2vUC2u','ywjZ','t0X1r3i','wM5iru4','wgLgDxq','ENzKEMe','u1rpuKfhrv9lrvK','u2vTihrLBgvMB25L','Dg9ju09tDhjPBMC','ANnJEgi','tgLJzw5Jysb2ywXPzgeGkg51DMvTkq','uK5QAuy','txnqEfa','BM91z0m','y2HHCKnVzgvbDa','tgL3sLC','CgLLuu8','w0fKBwLUxsbtzw5OysbZAw5JCM9UAxPHzgeGy29TiezPCMvIyxnLoG','EvLJDwu','tgLJzw7dP2fZigLTCg9YDgfKyxmGy29Tihn1y2vZC28','yu1Hshq','EgDcs1K','y3jXze0','qNLTse8','DMvYAwz5qwrTAw5qyxnZD29Yza','DNzlDKC','Dvv5r3O','BgLJzw5Zzxm','C2XJzMq','rgPLrxa','vgvzsMy','vg9KyxmGyxmGBgLJzw7dP2fZigzVCMfTigrLBgv0ywrHCW','vePYvwS','BwvZC2fNzq','BfrctNG','Dg9vChbLCKnHC2u','tgLJzw5Jysb2ywXPzgeGkgXVy2fSkq','AxnbCNjHEq','nZaWmdaWmgPPzgrXzW','Bg9JywW','z2v0qwXStgLJzw5Zzxm','zxjYB3i','rhHZCui','BLbhu0i','AxfkshK'];
  a0_0xea07=function() {
    return _0x5e3cd7;
  };
  return a0_0xea07();
}