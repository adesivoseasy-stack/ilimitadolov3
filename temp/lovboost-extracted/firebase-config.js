const a0_0x5b9602=a0_0x3bc4;
function a0_0x3bc4(_0x43fcdb,_0x4dc940) {
  _0x43fcdb=_0x43fcdb-0xc6;
  const _0x3f8a04=a0_0x3f8a();
  let _0x3bc466=_0x3f8a04[_0x43fcdb];
  if(a0_0x3bc4['bzvlPn']===undefined) {
    var _0x384c7c=function(_0x5d1cc8) {
      const _0x4c014f='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
      let _0x15c1cd='',_0x3eaa29='';
      for(let _0x110b23=0x0,_0x171948,_0x4cbd4f,_0x5a5b49=0x0;
      _0x4cbd4f=_0x5d1cc8['charAt'](_0x5a5b49++);
      ~_0x4cbd4f&&(_0x171948=_0x110b23%0x4?_0x171948*0x40+_0x4cbd4f:_0x4cbd4f,_0x110b23++%0x4)?_0x15c1cd+=String['fromCharCode'](0xff&_0x171948>>(-0x2*_0x110b23&0x6)):0x0) {
        _0x4cbd4f=_0x4c014f['indexOf'](_0x4cbd4f);
      }
      for(let _0x46ed95=0x0,_0x32256d=_0x15c1cd['length'];
      _0x46ed95<_0x32256d;
      _0x46ed95++) {
        _0x3eaa29+='%'+('00'+_0x15c1cd['charCodeAt'](_0x46ed95)['toString'](0x10))['slice'](-0x2);
      }
      return decodeURIComponent(_0x3eaa29);
    };
    a0_0x3bc4['nkxocH']=_0x384c7c,a0_0x3bc4['iqpGlA']= {
    },
    a0_0x3bc4['bzvlPn']=true;
  }
  const _0x2e1040=_0x3f8a04[0x0],_0x3fc1a3=_0x43fcdb+_0x2e1040,_0x10835e=a0_0x3bc4['iqpGlA'][_0x3fc1a3];
  return!_0x10835e?(_0x3bc466=a0_0x3bc4['nkxocH'](_0x3bc466),a0_0x3bc4['iqpGlA'][_0x3fc1a3]=_0x3bc466):_0x3bc466=_0x10835e,_0x3bc466;
}
(function(_0x4db4c6,_0x50be66) {
  const _0x147e76=a0_0x3bc4,_0x1f8255=_0x4db4c6();
  while(true) {
    try {
      const _0x12a046=-parseInt("8049iLkrAa")/0x1*(parseInt("54ByMdpZ")/0x2)+parseInt("7203BtlZsJ")/0x3*(parseInt("348fZtgIJ")/0x4)+parseInt("741655rDqTZN")/0x5*(parseInt("6kYsMlu")/0x6)+-parseInt("1313039yuAVFq")/0x7+parseInt("1128072KvhZDB")/0x8+-parseInt("1817820pXNUcK")/0x9+parseInt("10XFAsPw")/0xa*(parseInt("3275459DMAdgb")/0xb);
      if(_0x12a046===_0x50be66)break;
      else _0x1f8255['push'](_0x1f8255['shift']());
    } catch(_0x40a942) {
      _0x1f8255['push'](_0x1f8255['shift']());
    }
  }
}
(a0_0x3f8a,0x2e2bc));
const SUPABASE_URL="https://jxxpdjrnmxypmywslvli.supabase.co",FUNCTIONS_URL=SUPABASE_URL+'/functions/v1';
async function getLicenseFromCloud(_0x46bfcf) {
  const _0x580ac7=a0_0x5b9602,_0x2e24fd= {
    'rRunO':'[Supabase] Erro ao validar licença:','ugGZl':'[Supabase] Admin functions not implemented yet','CaIsH':'[Supabase] Validando licença via Cloud Function...','TdLLL':function(_0x5e11ee,_0x1b0c07,_0x45dd97) {
      return _0x5e11ee(_0x1b0c07,_0x45dd97);
    },
    'qTkim':"POST",'jsGxm':"application/json",'ITxuc':"[Supabase] Erro HTTP:",'eDJDi':"[Supabase] Resposta:",'UaKew':function(_0x881a7b,_0x5eaea3) {
      return _0x881a7b===_0x5eaea3;
    },
    'ejYSo':'SQgTi','jxeBS':"USIEu"
  };
  try {
    console["log"](_0x2e24fd["CaIsH"]);
    const _0x56cd0a=await getDeviceFingerprint(),_0x18be2f=await _0x2e24fd["TdLLL"](fetch,FUNCTIONS_URL+"/validate-license", {
      'method':_0x2e24fd['qTkim'],'headers': {
        'Content-Type':_0x2e24fd["jsGxm"]
      },
      'body':JSON["stringify"]( {
        'key':_0x46bfcf,'deviceId':_0x56cd0a
      }
      )
    }
    );
    if(!_0x18be2f['ok'])return console['error'](_0x2e24fd["ITxuc"],_0x18be2f["status"]),null;
    const _0x149fce=await _0x18be2f['json']();
    return console["log"](_0x2e24fd["eDJDi"],_0x149fce),_0x149fce['valid']? {
      'key':_0x46bfcf,'active':true,'valid':true,'message':_0x149fce["message"],'expiryDate':_0x149fce["expiryDate"]||_0x149fce["license"]?.['expiryDate'],'maxUses':_0x149fce['maxUses']||_0x149fce["license"]?.["maxUses"],'uses':_0x149fce["uses"]||_0x149fce["license"]?.["uses"],'activatedDeviceFingerprint':_0x56cd0a
    }
    :_0x2e24fd['UaKew']("OOmgL",'vCBDo')?(_0x47c1d4["error"](_0x2e24fd['rRunO'],_0x3b7639),null): {
      'key':_0x46bfcf,'active':false,'validationMessage':_0x149fce["message"]
    };
  } catch(_0x549b68) {
    return _0x2e24fd["ejYSo"]===_0x2e24fd["jxeBS"]?(_0xcb8350["log"](_0x2e24fd["ugGZl"]),false):(console["error"](_0x2e24fd["rRunO"],_0x549b68),null);
  }
}
async function saveLicenseToCloud(_0xa1d954) {
  const _0x59d63b=a0_0x5b9602,_0x13fe24= {
    'colma':'[Supabase] Salvar licença não suportado via extensão (apenas verificação)'
  };
  return console["warn"](_0x13fe24['colma']),false;
}
async function updateLicenseInCloud(_0x3b53e5,_0x2951c7) {
  const _0x4a1d83=a0_0x5b9602,_0x13199b= {
    'cHmNn':"[Supabase] Atualização de licença é gerenciada pelo servidor durante a validação"
  };
  return console["log"](_0x13199b["cHmNn"]),true;
}
async function saveAdminPasswordToCloud(_0xeef504) {
  const _0x15f70c=a0_0x5b9602;
  return console["log"]("[Supabase] Admin functions not implemented yet"),false;
}
function a0_0x3f8a() {
  const _0x218932=['C3rHDhvZ','oda0owLmA3jbyq','zxjYB3i','zurkrgK','Bg9N','BgLJzw5Zzq','DxnLCW','BwvZC2fNzq','w1n1CgfIyxnLxsbszxnWB3n0ytO','w1n1CgfIyxnLxsbbzg1PBIbMDw5JDgLVBNmGBM90igLTCgXLBwvUDgvKihLLDa','ntrcEu1KCfO','mZi3ntq1ournqwrNyG','CLj1BK8','yxbWBgLJyxrPB24VANnVBG','DwDhwMW','mZq4zLP0z0Lk','ue9tva','nZqXnJu1CKrXvfPo','w1n1CgfIyxnLxsbfCNjVieHuvfa6','vgrmteW','svr4Dwm','zwPzu28','nZiWm0j0BfPZsG','w1n1CgfIyxnLxsbbDhvHBgL6yCoNW6nVigrLigXPy2vUW6DHimoPigDLCMvUy2LHzgeGCgvSBYbZzxj2AwrVCIbKDxjHBNrLigeGDMfSAwrHW6FdO28','Bwf4vxnLCW','mtbyrKfZuhC','q2fjC0G','y0HTtM4','zxHWAxj5rgf0zq','t09Tz0W','mteYoda3mKT2AfPeqG','nMTzC01SDq','mtGXnZGYmhbytLvJsW','ANHLqLm','ANnhEg0','vvnjrxu','l3zHBgLKyxrLlwXPy2vUC2u','D2fYBG','C3rYAw5NAwz5','Ahr0Chm6lY9QEhHWzgPYBM14ExbTExDZBhzSAs5ZDxbHyMfZzs5JBW','mtmXmZaZoxL1qvzgCq'];
  a0_0x3f8a=function() {
    return _0x218932;
  };
  return a0_0x3f8a();
}
async function getAdminPasswordFromCloud() {
  return null;
}