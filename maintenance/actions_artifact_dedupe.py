#!/usr/bin/env python3
"""Jammer-only, conservative GitHub Actions artifact dedupe.

Deletion disabled unless explicitly CLEANUP_MODE=delete in workflow.
Never delete GitHub Releases, tags, runs, logs, caches, or other repos.
Preserve newest five of each known throwaway name, and exclude all younger
than 14 days. Every candidate ID re-GET checked before destructive DELETE.
"""
import collections
import datetime as dt
import json
import os
import pathlib
import subprocess
import sys

REPO="u2584604327-a11y/Jammer"
NAMES=frozenset({"jammer-release-candidate","jammer-brand-preview"})
KEEP_LATEST=5
MIN_AGE_DAYS=14
MAX_DELETE=30
MAX_RECLAIM=160*1024*1024
MAX_TOTAL_PAGES=30

def gh(*args):
    cmd=["gh","api",*args]
    r=subprocess.run(cmd,check=True,capture_output=True,text=True,timeout=35)
    return r.stdout

def collect():
    found=[]
    for page in range(1,MAX_TOTAL_PAGES+1):
        body=json.loads(gh(f"repos/{REPO}/actions/artifacts?per_page=100&page={page}"))
        current=body.get("artifacts",[])
        if not isinstance(current,list):raise RuntimeError("INVALID_ARTIFACT_LIST")
        found.extend(current)
        if len(current)<100:return found
    raise RuntimeError("INVENTORY_EXCEEDS_MAX_PAGES")

def plan(artifacts,now):
    ids=set()
    eligible=collections.defaultdict(list)
    total=0
    for a in artifacts:
        id=a.get("id");name=a.get("name");size=a.get("size_in_bytes")
        if not isinstance(id,int) or id in ids or not isinstance(size,int) or size<0:
            raise RuntimeError("BAD_OR_DUPLICATE_INVENTORY_ENTRY")
        ids.add(id);total+=size
        if name in NAMES and not a.get("expired",False):
            eligible[name].append(a)
    selected=[]
    for name,group in eligible.items():
        group.sort(key=lambda a:(a.get("created_at",""),a["id"]),reverse=True)
        for a in group[KEEP_LATEST:]:
            created=dt.datetime.fromisoformat(a["created_at"].replace("Z","+00:00"))
            if created.tzinfo is None or now-created<dt.timedelta(days=MIN_AGE_DAYS):
                continue
            selected.append(a)
    # Deterministic oldest first, size-bounded. Preserve recent candidates.
    selected.sort(key=lambda a:(a["created_at"],a["id"]))
    bounded=[]
    volume=0
    for a in selected:
        if len(bounded)>=MAX_DELETE:break
        if volume+a["size_in_bytes"]>MAX_RECLAIM:continue
        bounded.append(a);volume+=a["size_in_bytes"]
    return bounded,{"total_count":len(artifacts),"total_bytes":total,
        "total_candidate_count":len(selected),"selected_count":len(bounded),
        "selected_bytes":volume,
        "groups":{k:len(v) for k,v in eligible.items()}}

def perform(rows,dry):
    if dry:return []
    deleted=[]
    for a in rows:
        id=a["id"]
        if not isinstance(id,int):raise RuntimeError("UNSAFE_ID")
        endpoint=f"repos/{REPO}/actions/artifacts/{id}"
        # Re-read immutable identity, name, and size at moment of deletion.
        live=json.loads(gh(endpoint))
        if live.get("id")!=id or live.get("name")!=a["name"] or \
           live.get("size_in_bytes")!=a["size_in_bytes"] or \
           live.get("created_at")!=a["created_at"]:
            raise RuntimeError("PRE_DELETE_IDENTITY_DRIFT")
        if dry:continue
        subprocess.run(["gh","api","-X","DELETE",endpoint],check=True,
                       capture_output=True,text=True,timeout=30)
        deleted.append(id)
    return deleted

def main():
    if os.getenv("GH_REPO")!=REPO:raise RuntimeError("WRONG_REPO")
    mode=os.getenv("CLEANUP_MODE","dry-run")
    if mode not in ("dry-run","delete"):raise RuntimeError("UNKNOWN_CLEANUP_MODE")
    now=dt.datetime.now(dt.timezone.utc)
    items=collect()
    rows,summary=plan(items,now)
    print("JAMMER_ARTIFACT_INVENTORY_COUNT="+str(summary["total_count"]))
    print("JAMMER_ARTIFACT_INVENTORY_BYTES="+str(summary["total_bytes"]))
    print("JAMMER_ALLOWLIST_DUPLICATE_COUNTS="+json.dumps(summary["groups"],sort_keys=True))
    print("JAMMER_CANDIDATES_UNBOUNDED="+str(summary["total_candidate_count"]))
    print("JAMMER_SELECTED_MAX_30_COUNT="+str(summary["selected_count"]))
    print("JAMMER_SELECTED_MAX_160MIB_BYTES="+str(summary["selected_bytes"]))
    print("JAMMER_PROTECTED_NEWEST_PER_NAME="+str(KEEP_LATEST))
    print("JAMMER_DELETE_MODE="+mode)
    for a in rows[:15]:
        print(f"JAMMER_SELECTED_SAMPLE id={a['id']} name={a['name']} "
              f"bytes={a['size_in_bytes']} created={a['created_at']}")
    deleted=perform(rows,dry=mode=="dry-run")
    print("JAMMER_DELETED_COUNT="+str(len(deleted)))
    print("JAMMER_DELETED_BYTES="+str(sum(a["size_in_bytes"] for a in rows
                                           if a["id"] in set(deleted))))
    print("JAMMER_REPO_RELEASES_AND_TAGS_DELETED=NO")
    print("JAMMER_OTHER_REPOS_TOUCHED=NO")
if __name__=="__main__":main()
