# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# stdin에서 JSON 읽기
try {
    $json = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($json)) {
        exit 0
    }

    $obj = $json | ConvertFrom-Json -ErrorAction Stop
    $path = $obj.tool_input.file_path

    # 소스 코드 파일 판별: .ts/.tsx이지만 테스트 파일은 제외
    # - Edit/Write 도구로 수정하는 경우 모두 감지
    if ($path -match '\.(ts|tsx)$' `
        -and $path -notmatch '\.(test|spec)\.(ts|tsx)$' `
        -and $path -notmatch '\.d\.ts$') {

        # TDD 리마인더 메시지
        Write-Host 'TDD 리마인더: 소스 코드를 수정하기 전에 실패하는 테스트를 먼저 작성했나요? (RED 단계 확인)' -ForegroundColor Yellow
    }
}
catch {
    # 에러는 무시 (훅 실패로 인한 도구 실패 방지)
    exit 0
}
