#! /usr/bin/python
# -*- coding: utf-8 -*-

# 引数に指定(複数可)した全ドメイン文字列に対してDNSによる名前解決を行う
# IPv4/IPv6両対応,CNAME対応

from __future__ import print_function

from socket import AI_CANONNAME, getaddrinfo, gaierror
try:
  from socket.AddressFamily import AF_INET6, AF_INET  # Python 3
  from socket.SocketKind import SOCK_STREAM
except ImportError:
  from socket import AF_INET6, AF_INET, SOCK_STREAM   # Python 2
import sys


def nslookup (hostlist):
  """
  名前解決を行う
  """
  for host in hostlist:
    try:
      # 別名の処理を行うためにAI_CANONNAMEを指定する
      addrinfolist = getaddrinfo (host, None, 0, 0, 0, AI_CANONNAME)
    except gaierror:
      print ('{0} -> *** NOT FOUND ***'.format (host))
      continue

    # getaddrinfo()ではタプルの *リスト* が返されるため
    # リストの各要素ごとにループしつつタプルの要素も展開する
    # IPアドレスの文字列はタプルsockaddrの最初(0番)の要素となる
    # このプログラムではprotoは使用していない
    for family, kind, proto, canonical, sockaddr in addrinfolist:
      # IPv4かIPv6かを判定して出力に含めることにする
      ipver = ''
      if family == AF_INET6:
        ipver = ' [IPv6]'
      elif family == AF_INET:
        ipver = ' [IPv4]'

      # kindの値ごとに重複した項目が存在し
      # また、canonicalは一番最初の項目以外は空文字列になるため
      # SOCK_STREAMの項目でのみ表示処理を行う
      if kind == SOCK_STREAM:
        if canonical == host or canonical == '':
          # 別名が設定されていない場合はIPアドレスを表示
          print ('{0} = {1}{2}'.format (host, sockaddr[0], ipver))
        else:
          # 別名が設定されている場合はそれを表示してから
          # 名前解決処理を行い、ループを抜ける
          print ('{0} -> {1}'.format (host, canonical))
          nslookup ([canonical,])
          break


if __name__ == '__main__':
  if len (sys.argv) < 2:
    sys.exit ('USAGE: {0} [HOSTNAME...]'.format (__file__))

  # 重複する引数があれば取り除く
  hosts = []
  for host in sys.argv[1:]:
    if not host in hosts:
      hosts.append (host)

  # 処理対象のリストを関数に渡す
  nslookup (hosts)
